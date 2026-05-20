import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit
 *
 * Cookie 的 audit log 是給使用者本人看的「儀器內部齒輪」。
 * 列出最近的操作軌跡——上傳、生成、編輯、清除、對話紀錄等。
 *
 * Query params:
 *   limit  最多筆數（預設 100，上限 500）
 *   offset 偏移（預設 0）
 */
export async function GET(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ entries: [], total: 0 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
      },
    }),
    db.auditLog.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ entries, total });
}
