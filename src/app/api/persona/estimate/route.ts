import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { estimatePipeline } from '@/server/persona/generate';
import { isMockMode, mockEstimate } from '@/server/persona/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/persona/estimate — 預估這次 persona pipeline 的時間與成本。 */
export async function GET() {
  // 模擬模式：回假預估，不需要使用者。
  if (isMockMode()) {
    return NextResponse.json(mockEstimate());
  }

  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }
  const estimate = await estimatePipeline(user.id);
  return NextResponse.json(estimate);
}
