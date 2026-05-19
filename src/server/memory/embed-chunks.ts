import { db } from '@/lib/db';
import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { embedBatch } from '@/lib/embedding';

const EMBED_BATCH = 100;

export interface EmbedBatchResult {
  total: number;
  embedded: number;
  failed: number;
}

/**
 * 把已標註但還沒 embed 的 chunks 推進 Qdrant.chunks。
 * 走 OpenAI embeddings 批次 API（一次最多 100 條），避免單筆 round-trip。
 */
export async function embedAllPending(
  userId: string
): Promise<EmbedBatchResult> {
  const pending = await db.conversationChunk.findMany({
    where: {
      uploadedChat: { userId },
      annotatedAt: { not: null },
      embeddedAt: null,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      participants: true,
      summary: true,
      chatType: true,
      emotionalTone: true,
      yourPosition: true,
      topics: true,
      importance: true,
      uploadedChat: {
        select: { id: true, chatRoom: true },
      },
    },
  });

  if (pending.length === 0) {
    return { total: 0, embedded: 0, failed: 0 };
  }

  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const texts = batch.map((c) => buildEmbedText(c));

    try {
      const vectors = await embedBatch(texts);

      const points = batch.map((c, j) => ({
        id: c.id,
        vector: vectors[j],
        payload: {
          userId,
          uploadedChatId: c.uploadedChat.id,
          chatRoom: c.uploadedChat.chatRoom,
          chatType: c.chatType ?? 'other',
          summary: c.summary ?? '',
          yourPosition: c.yourPosition ?? null,
          topics: c.topics,
          importance: c.importance ?? 0,
          emotionalTone: c.emotionalTone ?? 'neutral',
          startTime: c.startTime.toISOString(),
          endTime: c.endTime.toISOString(),
          participants: c.participants,
        },
      }));

      await qdrant.upsert(COLLECTIONS.chunks, { points });

      // qdrantPointId 跟 chunk.id 同值（直接用 chunk id 作為 Qdrant point id）。
      // 一次 SQL 改完 N 列：embeddedAt=now, qdrantPointId=id
      const now = new Date();
      await Promise.all(
        batch.map((c) =>
          db.conversationChunk.update({
            where: { id: c.id },
            data: { embeddedAt: now, qdrantPointId: c.id },
          })
        )
      );

      embedded += batch.length;
    } catch (err) {
      failed += batch.length;
      console.warn('[embed-chunks] batch failed', err);
    }
  }

  return { total: pending.length, embedded, failed };
}

interface EmbedSource {
  summary: string | null;
  yourPosition: string | null;
  topics: string[];
}

function buildEmbedText(c: EmbedSource): string {
  return [
    c.summary ?? '',
    c.yourPosition ? `立場：${c.yourPosition}` : '',
    c.topics.length > 0 ? `主題：${c.topics.join('、')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
