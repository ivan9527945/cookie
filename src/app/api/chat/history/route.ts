import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';
import { getActiveSession } from '@/server/chat/session';
import type { ChatTurn } from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMIT = 100;

/** GET /api/chat/history — 取得目前 session 最近 N 筆訊息（chronological） */
export async function GET() {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ session: null, messages: [] });
  }
  const session = await getActiveSession();
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ session: null, messages: [] });
  }

  const rows = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'desc' },
    take: LIMIT,
  });

  const messages: ChatTurn[] = rows
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as ChatTurn['role'],
      content: m.content,
    }));

  return NextResponse.json({
    session: { id: session.id, startedAt: session.startedAt },
    messages,
  });
}
