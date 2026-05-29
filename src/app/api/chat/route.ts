import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { anthropic } from '@/lib/anthropic';
import { getActiveUser } from '@/server/user';
import { getOrCreateActiveSession } from '@/server/chat/session';
import { prepareChatTurn } from '@/server/chat/pipeline';
import { extractEpisodes } from '@/server/memory/episodic';
import { writeAudit } from '@/server/audit';
import { isMockMode } from '@/server/persona/mock';
import { mockChatResponse } from '@/server/chat/mock';
import type { ChatRequestBody, ChatTurn } from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const HISTORY_LIMIT = 20;

/**
 * POST /api/chat — streaming chat endpoint
 *
 * 1. 解析使用者 / persona / session
 * 2. 把 user message 寫進 ChatMessage
 * 3. 用最近 N 筆歷史 + persona + 檢索到的記憶組 system prompt
 * 4. anthropic.messages.stream → 一段一段 enqueue 到 ReadableStream
 * 5. stream 結束後背景：寫 assistant message + audit + 抽 episodic memory
 */
export async function POST(req: NextRequest) {
  // 模擬模式：不需要 user / persona / Claude，直接串流一段 mock 回覆。
  if (isMockMode()) {
    let mockBody: ChatRequestBody;
    try {
      mockBody = (await req.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    }
    if (!mockBody.message?.trim()) {
      return NextResponse.json({ error: 'empty message' }, { status: 400 });
    }
    return mockChatResponse(mockBody.message, mockBody.mode ?? 'mirror');
  }

  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  const session = await getOrCreateActiveSession(user.id);

  // 1. 寫入 user message
  const userMessage = await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: body.message,
    },
  });

  // 2. 取近 N 筆對話（不含剛剛這筆 — 它會被 prepareChatTurn 當作 input.message 傳入）
  const recent = await db.chatMessage.findMany({
    where: { sessionId: session.id, id: { not: userMessage.id } },
    orderBy: { timestamp: 'desc' },
    take: HISTORY_LIMIT,
  });
  const history: ChatTurn[] = recent
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as ChatTurn['role'],
      content: m.content,
    }));

  // 3. 組 prompt + retrieval
  let turn: Awaited<ReturnType<typeof prepareChatTurn>>;
  try {
    turn = await prepareChatTurn({
      userId: user.id,
      yourName: user.name,
      history,
      message: body.message,
      mode: body.mode ?? 'mirror',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        hint: '可能還沒生成 persona，請先到 /onboarding/process 跑一次 pipeline。',
      },
      { status: 412 }
    );
  }

  // 4. 開 stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = '';
      let tokensUsed = 0;
      const modelUsed = turn.request.model;

      try {
        const sdkStream = anthropic.messages.stream(
          {
            model: turn.request.model,
            system: turn.request.system,
            messages: turn.request.messages,
            max_tokens: turn.request.max_tokens,
            metadata: turn.request.metadata,
          },
          { signal: req.signal }
        );

        for await (const event of sdkStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullText += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        const finalMessage = await sdkStream.finalMessage();
        tokensUsed =
          (finalMessage.usage?.input_tokens ?? 0) +
          (finalMessage.usage?.output_tokens ?? 0);

        controller.close();
      } catch (err) {
        const aborted = req.signal?.aborted || isAbortError(err);
        if (!aborted) {
          console.error('[chat] stream error', err);
          controller.error(err);
          return;
        }
        // 使用者中斷：把目前累積的內容保留下來、關閉串流，不視為 error
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }

      // 5. 背景：寫 assistant message + audit + episodic extract
      //    使用者中斷時 fullText 是部分回應；仍然存下來保留上下文。
      void (async () => {
        if (!fullText) return;
        try {
          await db.chatMessage.create({
            data: {
              sessionId: session.id,
              role: 'assistant',
              content: fullText,
              modelUsed,
              tokensUsed: tokensUsed || null,
              retrievedChunkIds: turn.retrievedChunkIds,
              retrievedEpisodeIds: turn.retrievedEpisodeIds,
            },
          });

          await db.chatSession.update({
            where: { id: session.id },
            data: { messageCount: { increment: 2 } },
          });

          await writeAudit(user.id, 'chat_session_start', {
            sessionId: session.id,
            tokensUsed,
            aborted: req.signal?.aborted ?? false,
          });

          // episodic extract（最近 6 筆）— 中斷或失敗都只 warn
          await extractEpisodes(session.id, user.id, [
            ...history.slice(-4),
            { role: 'user', content: body.message },
            { role: 'assistant', content: fullText },
          ]).catch((err) => {
            console.warn('[chat] extractEpisodes failed', err);
          });
        } catch (err) {
          console.warn('[chat] post-stream save failed', err);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  });
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return true;
    if ('status' in err && (err as { status?: number }).status === 499) {
      return true;
    }
  }
  return false;
}
