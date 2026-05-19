import { NextResponse } from 'next/server';
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
 *
 * 沒有 active version 時回 null。
 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json(null);
  const state = await getActivePersonaState(user.id);
  if (!state) return NextResponse.json(null);
  return NextResponse.json({
    profile: state.merged,
    raw: state.raw,
    overrides: state.overrides,
    version: state.version,
    versionId: state.versionId,
    generatedAt: state.generatedAt,
  });
}
