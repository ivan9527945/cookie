import { NextResponse, type NextRequest } from 'next/server';
import { getActiveUser } from '@/server/user';
import { writeAudit } from '@/server/audit';
import {
  clearAllEpisodes,
  countEpisodes,
  listEpisodes,
  softDeleteEpisode,
} from '@/server/memory/episodes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/memory — 列出長期記憶（軟刪除後消失） */
export async function GET(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ episodes: [], total: 0 });
  }
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const [episodes, total] = await Promise.all([
    listEpisodes(user.id, { limit, offset }),
    countEpisodes(user.id),
  ]);
  return NextResponse.json({ episodes, total });
}

/**
 * DELETE /api/memory?id=xxx — 軟刪除單筆
 * DELETE /api/memory          — 清空目前 user 的所有 episodes
 *
 * 兩種都會同步刪除對應的 Qdrant point。
 */
export async function DELETE(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (id) {
    const ok = await softDeleteEpisode(user.id, id);
    if (!ok) {
      return NextResponse.json({ error: 'episode not found' }, { status: 404 });
    }
    await writeAudit(user.id, 'data_purge', { kind: 'episode', episodeId: id });
    return NextResponse.json({ deleted: 1, episodeId: id });
  }

  const cleared = await clearAllEpisodes(user.id);
  await writeAudit(user.id, 'data_purge', { kind: 'all_episodes', cleared });
  return NextResponse.json({ deleted: cleared });
}
