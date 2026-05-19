import { db } from '@/lib/db';
import { qdrant, COLLECTIONS } from '@/lib/qdrant';

export interface EpisodeSummary {
  id: string;
  sessionId: string;
  summary: string;
  importance: number;
  emotionalValence: number | null;
  createdAt: Date;
}

/** 列出該 user 還沒被軟刪的長期記憶（依 createdAt 倒序）*/
export async function listEpisodes(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<EpisodeSummary[]> {
  const { limit = 100, offset = 0 } = options;
  const rows = await db.episode.findMany({
    where: {
      session: { userId },
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      sessionId: true,
      summary: true,
      importance: true,
      emotionalValence: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    summary: r.summary,
    importance: r.importance,
    emotionalValence: r.emotionalValence,
    createdAt: r.createdAt,
  }));
}

export async function countEpisodes(userId: string): Promise<number> {
  return db.episode.count({
    where: { session: { userId }, deletedAt: null },
  });
}

/**
 * 軟刪除單筆 episode：
 *   1. Postgres 標 deletedAt + 清掉 embedding 連結
 *   2. Qdrant point 直接刪除（之後檢索就拿不到）
 *
 * 不是 hard delete — 保留 Postgres 紀錄，讓使用者之後若想看「曾經有過什麼」
 * 還能撈得到（管理介面可加 trash bin）。
 */
export async function softDeleteEpisode(
  userId: string,
  episodeId: string
): Promise<boolean> {
  const row = await db.episode.findFirst({
    where: { id: episodeId, session: { userId }, deletedAt: null },
    select: { id: true, qdrantPointId: true },
  });
  if (!row) return false;

  try {
    if (row.qdrantPointId) {
      await qdrant.delete(COLLECTIONS.episodes, { points: [row.qdrantPointId] });
    }
  } catch (err) {
    console.warn('[episodes] qdrant delete failed', err);
  }

  await db.episode.update({
    where: { id: row.id },
    data: {
      deletedAt: new Date(),
      qdrantPointId: null,
      embeddedAt: null,
    },
  });
  return true;
}

/** 清空全部活著的 episodes（Postgres 軟刪 + Qdrant 用 filter 一次刪掉） */
export async function clearAllEpisodes(userId: string): Promise<number> {
  const rows = await db.episode.findMany({
    where: { session: { userId }, deletedAt: null },
    select: { id: true, qdrantPointId: true },
  });
  if (rows.length === 0) return 0;

  try {
    await qdrant.delete(COLLECTIONS.episodes, {
      filter: {
        must: [{ key: 'userId', match: { value: userId } }],
      },
    });
  } catch (err) {
    console.warn('[episodes] qdrant filter delete failed', err);
  }

  await db.episode.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: {
      deletedAt: new Date(),
      qdrantPointId: null,
      embeddedAt: null,
    },
  });
  return rows.length;
}
