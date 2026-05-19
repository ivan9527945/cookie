import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { embed } from '@/lib/embedding';
import type { RetrievalResult } from '@/types/memory';

export interface RetrieveOptions {
  chunkLimit?: number;
  episodeLimit?: number;
  minImportance?: number;
}

export async function retrieveMemories(
  query: string,
  userId: string,
  options: RetrieveOptions = {}
): Promise<RetrievalResult> {
  const { chunkLimit = 5, episodeLimit = 3, minImportance = 4 } = options;

  const queryVector = await embed(query);

  const [chunkRes, episodeRes] = await Promise.all([
    qdrant.search(COLLECTIONS.chunks, {
      vector: queryVector,
      limit: chunkLimit,
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'importance', range: { gte: minImportance } },
        ],
      },
      with_payload: true,
    }),
    qdrant.search(COLLECTIONS.episodes, {
      vector: queryVector,
      limit: episodeLimit,
      filter: {
        must: [{ key: 'userId', match: { value: userId } }],
      },
      with_payload: true,
    }),
  ]);

  return {
    chunks: chunkRes.map((p) => ({
      id: String(p.id),
      score: p.score,
      summary: (p.payload?.summary as string) ?? '',
      yourPosition: (p.payload?.yourPosition as string | null) ?? null,
      topics: (p.payload?.topics as string[]) ?? [],
      importance: (p.payload?.importance as number) ?? 0,
    })),
    episodes: episodeRes.map((p) => ({
      id: String(p.id),
      score: p.score,
      summary: (p.payload?.summary as string) ?? '',
      importance: (p.payload?.importance as number) ?? 0,
      createdAt: (p.payload?.createdAt as string) ?? '',
    })),
  };
}
