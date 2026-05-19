import { NextResponse, type NextRequest } from 'next/server';
import type { ChatRequestBody } from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chat — streaming chat endpoint (text/event-stream-ish chunked plain text)
 *
 * TODO:
 *   1. 從 cookie / header 取得 userId / sessionId
 *   2. 呼叫 prepareChatTurn(...) 拿 system prompt + retrieved memory
 *   3. anthropic.messages.stream(...) → pipe 給 TransformStream
 *   4. 對話結束後 extractEpisodes 寫入長期記憶
 *
 * 目前先回傳 echo stream，讓 UI 流程能跑通。
 */
export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const echo = `（尚未接上 LLM）你說：「${body.message}」`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const ch of echo) {
        controller.enqueue(encoder.encode(ch));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.close();
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
