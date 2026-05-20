import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { computeFootprint } from '@/server/persona/footprint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/persona/footprint
 *
 * 即時計算使用者的語言指紋（純統計，不呼叫 LLM）。
 * 對幾萬筆訊息也是亞秒級，先不快取；之後若太慢可以 memoize。
 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const footprint = await computeFootprint(user.id);
  return NextResponse.json(footprint);
}
