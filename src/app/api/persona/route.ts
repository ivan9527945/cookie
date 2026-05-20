import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';
import { getActivePersonaState } from '@/server/persona/update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/persona — 回 active persona 的所有資料：
 *   - profile: merge 後（套 overrides）的版本，給 UI 直接顯示
 *   - raw: 模型輸出，給編輯 UI 比對用
 *   - overrides: 使用者手動覆寫
 *   - version / versionId / generatedAt
 *   - messageCount: 此使用者目前累計訊息數（給 persona header 顯示）
 *   - dayCount: 累計天數 = (最後一則訊息 − 第一則訊息) 的日數
 *
 * 沒有 active version 時回 null。
 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const state = await getActivePersonaState(user.id);
  if (!state) return NextResponse.json(null);

  // T-105：給 persona header 顯示「based on N messages across D days」
  const range = await db.lineMessage.aggregate({
    where: { uploadedChat: { userId: user.id } },
    _count: { _all: true },
    _min: { timestamp: true },
    _max: { timestamp: true },
  });
  const messageCount = range._count._all;
  const dayCount =
    range._min.timestamp && range._max.timestamp
      ? Math.max(
          1,
          Math.ceil(
            (range._max.timestamp.getTime() - range._min.timestamp.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return NextResponse.json({
    profile: state.merged,
    raw: state.raw,
    overrides: state.overrides,
    version: state.version,
    versionId: state.versionId,
    generatedAt: state.generatedAt,
    messageCount,
    dayCount,
  });
}
