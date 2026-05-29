import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';
import {
  endSession,
  getActiveSession,
  getOrCreateActiveSession,
} from '@/server/chat/session';
import { isMockMode } from '@/server/persona/mock';
import { clearMockChat, mockSessionMeta } from '@/server/chat/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'cookie_session_id';

/** POST /api/chat/session — 結束目前 session、建立新 session */
export async function POST() {
  // 模擬模式：清掉記憶體對話，回一個新的假 session。
  if (isMockMode()) {
    clearMockChat();
    const meta = mockSessionMeta();
    return NextResponse.json({ id: meta.id, startedAt: meta.startedAt });
  }

  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  const current = await getActiveSession();
  if (current?.userId === user.id && !current.endedAt) {
    await endSession(current.id);
  }

  // 刪掉舊 cookie，getOrCreateActiveSession 才會建一個新的
  const store = await cookies();
  store.delete(SESSION_COOKIE);

  const fresh = await getOrCreateActiveSession(user.id);
  return NextResponse.json({
    id: fresh.id,
    startedAt: fresh.startedAt,
  });
}

/** DELETE /api/chat/session — 結束目前 session（保留紀錄但不再追加訊息） */
export async function DELETE() {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }
  const session = await getActiveSession();
  if (session && session.userId === user.id && !session.endedAt) {
    await endSession(session.id);
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

/** GET /api/chat/session — 目前 session 的 meta（讓 UI 顯示開始時間 / 訊息數） */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const session = await getActiveSession();
  if (!session || session.userId !== user.id) return NextResponse.json(null);
  const messageCount = await db.chatMessage.count({
    where: { sessionId: session.id },
  });
  return NextResponse.json({
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    messageCount,
  });
}
