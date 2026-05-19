import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/persona — 取得當前 active persona profile
 *
 * TODO: 介接 getActivePersona(userId) 後從 db 讀出；目前回傳 null。
 */
export async function GET() {
  return NextResponse.json(null);
}
