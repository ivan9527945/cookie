import pLimit from 'p-limit';
import { db } from '@/lib/db';
import { annotateChunk } from '@/server/line-parser/annotate';
import { setStatus } from './status';
import type { LineMessage } from '@/types/line';
import type { MessageType } from '@prisma/client';

const ANNOTATE_CONCURRENCY = 8;

export interface AnnotateBatchResult {
  total: number;
  annotated: number;
  failed: number;
}

/**
 * 把 user 名下所有 annotatedAt=null 的 chunks 過一輪 Claude Haiku。
 * 進度透過 setStatus(userId, ...) 廣播。
 * 失敗的 chunk 不會擋住其他人，但會被計入 failed。
 */
export async function annotateAllPending(
  userId: string,
  yourName: string
): Promise<AnnotateBatchResult> {
  const total = await db.conversationChunk.count({
    where: { uploadedChat: { userId } },
  });

  const pending = await db.conversationChunk.findMany({
    where: {
      uploadedChat: { userId },
      annotatedAt: null,
    },
    include: { messages: { orderBy: { timestamp: 'asc' } } },
  });

  const alreadyDone = total - pending.length;
  setStatus(userId, {
    state: 'annotating',
    annotated: alreadyDone,
    totalChunks: total,
  });

  let done = alreadyDone;
  let failed = 0;
  const limit = pLimit(ANNOTATE_CONCURRENCY);

  await Promise.all(
    pending.map((chunk) =>
      limit(async () => {
        try {
          const lineMessages: LineMessage[] = chunk.messages.map((m) => ({
            timestamp: m.timestamp,
            speaker: m.speaker,
            isYou: m.isYou,
            type: m.type as MessageType,
            content: m.content,
          }));
          const yourMessages = lineMessages.filter(
            (m) => m.isYou && m.type === 'text'
          );

          const annotation = await annotateChunk(
            {
              id: chunk.id,
              chatRoom: '',
              startTime: chunk.startTime,
              endTime: chunk.endTime,
              participants: chunk.participants,
              messages: lineMessages,
              yourMessages,
            },
            yourName
          );

          await db.conversationChunk.update({
            where: { id: chunk.id },
            data: {
              summary: annotation.summary,
              chatType: annotation.chatType,
              emotionalTone: annotation.emotionalTone,
              yourPosition: annotation.yourPosition ?? null,
              topics: annotation.topics,
              importance: annotation.importance,
              annotatedAt: new Date(),
            },
          });

          done += 1;
        } catch (err) {
          failed += 1;
          console.warn('[annotate-batch] chunk failed', chunk.id, err);
        } finally {
          setStatus(userId, {
            state: 'annotating',
            annotated: done,
            totalChunks: total,
          });
        }
      })
    )
  );

  return { total, annotated: done, failed };
}
