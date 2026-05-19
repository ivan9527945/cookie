import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'cookie_user_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** 取得目前 cookie 對應的使用者；沒有就回 null */
export async function getActiveUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

/**
 * Cookie 是單人 app。第一次 ingest 時建立使用者並寫 cookie；之後沿用。
 * 若 cookie 對應的 user 不存在（例如 DB 清過）則重新建立。
 */
export async function getOrCreateActiveUser(opts: {
  name: string;
  displayName?: string;
}): Promise<User> {
  const store = await cookies();
  const existingId = store.get(COOKIE_NAME)?.value;
  if (existingId) {
    const existing = await db.user.findUnique({ where: { id: existingId } });
    if (existing) return existing;
  }

  const created = await db.user.create({
    data: {
      name: opts.name,
      displayName: opts.displayName ?? opts.name,
    },
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

export async function clearActiveUserCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
