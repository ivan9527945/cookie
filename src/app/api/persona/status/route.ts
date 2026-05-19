import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { getStatus } from '@/server/persona/status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona/status — 回 in-memory 進度。UI 用 setInterval polling。 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }
  return NextResponse.json(getStatus(user.id));
}
