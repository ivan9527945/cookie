import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/memory — 列出長期記憶（episodes）
 * DELETE /api/memory — 全清（須二次確認；目前直接清空）
 *
 * TODO 實作：呼叫 db + qdrant 雙寫刪除，並寫 audit log。
 */
export async function GET() {
  return NextResponse.json({ episodes: [] });
}

export async function DELETE() {
  return NextResponse.json({ purged: true }, { status: 202 });
}
