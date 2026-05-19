import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/persona/generate — 觸發 persona 抽取 pipeline
 *
 * TODO: 排程背景 job（建議走 Redis queue 或 Vercel/Railway 的 worker process）
 *       目前同步回 202 表示已收到。
 */
export async function POST() {
  return NextResponse.json({ status: 'queued' }, { status: 202 });
}
