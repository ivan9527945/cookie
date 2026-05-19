import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { listVersions } from '@/server/persona/update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona/versions — 列出該 user 的所有 persona 版本（降冪） */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ versions: [] });
  const versions = await listVersions(user.id);
  return NextResponse.json({ versions });
}
