import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';
import { getActiveSession } from '@/server/chat/session';
import type {
  ChatHistoryMessage,
  ChatHistoryResponse,
} from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMIT = 100;

/**
 * GET /api/chat/history — 取得目前 session 最近 N 筆訊息（chronological）。
 * Assistant 訊息會附 retrievedCount 讓 UI 透明顯示 Cookie 用了哪些記憶。
 */
export async function GET() {
  const empty: ChatHistoryResponse = { session: null, messages: [] };
  const user = await getActiveUser();
  if (!user) return NextResponse.json(empty);

  const session = await getActiveSession();
  if (!session || session.userId !== user.id) return NextResponse.json(empty);

  const rows = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'desc' },
    take: LIMIT,
  });

  const messages: ChatHistoryMessage[] = rows
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as ChatHistoryMessage['role'],
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      retrievedCount:
        m.role === 'assistant'
          ? {
              chunks: m.retrievedChunkIds.length,
              episodes: m.retrievedEpisodeIds.length,
            }
          : undefined,
    }));

  return NextResponse.json({
    session: {
      id: session.id,
      startedAt: session.startedAt.toISOString(),
    },
    messages,
  });
}
