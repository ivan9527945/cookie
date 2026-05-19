import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { ChatSession } from '@prisma/client';

const COOKIE_NAME = 'cookie_session_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getActiveSession(): Promise<ChatSession | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  return db.chatSession.findUnique({ where: { id } });
}

/** 取得 cookie 對應的 session；若 cookie 沒寫或 session 已刪除則新建 */
export async function getOrCreateActiveSession(
  userId: string
): Promise<ChatSession> {
  const store = await cookies();
  const existingId = store.get(COOKIE_NAME)?.value;
  if (existingId) {
    const existing = await db.chatSession.findFirst({
      where: { id: existingId, userId },
    });
    if (existing) return existing;
  }

  const created = await db.chatSession.create({
    data: { userId, startedAt: new Date() },
  });
  store.set({
    name: COOKIE_NAME,
    value: created.id,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    path: '/',
  });
  return created;
}

export async function endSession(sessionId: string): Promise<void> {
  await db.chatSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });
}
