import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { computeAvoidance } from '@/server/persona/avoidance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona/avoidance — 純統計，回 self/other 提及差異大的主題 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const result = await computeAvoidance(user.id);
  return NextResponse.json(result);
}
