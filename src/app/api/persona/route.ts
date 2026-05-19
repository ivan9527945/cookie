import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { getActivePersona } from '@/server/persona/update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona — 回目前 active 的 PersonaProfile，沒有就 null */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const persona = await getActivePersona(user.id);
  return NextResponse.json(persona);
}
