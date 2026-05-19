import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { estimatePipeline } from '@/server/persona/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona/estimate — 預估這次 persona pipeline 的時間與成本。 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }
  const estimate = await estimatePipeline(user.id);
  return NextResponse.json(estimate);
}
