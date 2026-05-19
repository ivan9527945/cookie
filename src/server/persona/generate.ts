import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { writeAudit } from '@/server/audit';
import { annotateAllPending } from './annotate-batch';
import { extractPersona } from './extract';
import { setStatus } from './status';
import type { AnnotatedChunk, ChatType, EmotionalTone } from '@/types/line';

export interface PersonaGenerateResult {
  version: number;
  basedOnChunks: number;
  annotatedChunks: number;
  failedAnnotations: number;
}

/**
 * 完整 persona pipeline：
 *   1. annotate 所有 pending chunks（Haiku × N，併發 8）
 *   2. 從 DB 撈出已標註且 importance >= 4 的 chunks
 *   3. extractPersona（map-reduce on Opus）
 *   4. 寫 PersonaProfile（version = max+1, isActive=true，舊版本 isActive=false）
 *   5. 寫 audit log
 */
export async function runPersonaPipeline(
  userId: string,
  yourName: string
): Promise<PersonaGenerateResult> {
  const startedAt = new Date().toISOString();
  setStatus(userId, { state: 'annotating', startedAt });

  const annotateResult = await annotateAllPending(userId, yourName);

  const usable = await db.conversationChunk.findMany({
    where: {
      uploadedChat: { userId },
      annotatedAt: { not: null },
      importance: { gte: 4 },
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
    },
  });

  if (usable.length === 0) {
    const message =
      '沒有符合條件的對話段落（importance >= 4）。' +
      '可能是 chunk 太少或都被判為閒聊。';
    setStatus(userId, { state: 'error', message });
    throw new Error(message);
  }

  setStatus(userId, {
    state: 'extracting',
    annotated: annotateResult.annotated,
    totalChunks: annotateResult.total,
  });

  const input: AnnotatedChunk[] = usable.map((c) => ({
    id: c.id,
    chatRoom: '',
    startTime: c.startTime,
    endTime: c.endTime,
    participants: c.participants,
    messages: [],
    yourMessages: [],
    summary: c.summary ?? '',
    chatType: (c.chatType ?? 'other') as ChatType,
    emotionalTone: (c.emotionalTone ?? 'neutral') as EmotionalTone,
    yourPosition: c.yourPosition ?? undefined,
    topics: c.topics,
    importance: c.importance ?? 0,
  }));

  const profile = await extractPersona(yourName, input, {
    onProgress: (e) => {
      setStatus(userId, {
        state: 'extracting',
        annotated: annotateResult.annotated,
        totalChunks: annotateResult.total,
        message:
          e.stage === 'final'
            ? '整合最終 persona…'
            : `mini-persona ${e.done}/${e.total}（${e.context}）`,
      });
    },
  });

  const previous = await db.personaProfile.findFirst({
    where: { userId, isActive: true },
    select: { id: true, version: true },
  });
  const nextVersion = (previous?.version ?? 0) + 1;
  const versionedProfile = { ...profile, version: nextVersion };

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  if (previous) {
    updates.push(
      db.personaProfile.update({
        where: { id: previous.id },
        data: { isActive: false },
      })
    );
  }
  updates.push(
    db.personaProfile.create({
      data: {
        userId,
        version: nextVersion,
        parentVersionId: previous?.id ?? null,
        isActive: true,
        profile: versionedProfile as unknown as Prisma.InputJsonValue,
        basedOnMessages: input.length,
        generationModel: 'claude-opus-4-7',
      },
    })
  );
  await db.$transaction(updates);

  await writeAudit(userId, 'generate_persona', {
    version: nextVersion,
    basedOnChunks: input.length,
    annotated: annotateResult.annotated,
    failedAnnotations: annotateResult.failed,
  });

  setStatus(userId, {
    state: 'done',
    version: nextVersion,
    annotated: annotateResult.annotated,
    totalChunks: annotateResult.total,
  });

  return {
    version: nextVersion,
    basedOnChunks: input.length,
    annotatedChunks: annotateResult.annotated,
    failedAnnotations: annotateResult.failed,
  };
}

export interface PipelineEstimate {
  totalChunks: number;
  pendingAnnotation: number;
  estimatedMiniPersonaBatches: number;
  /** Haiku ~$0.001/chunk + Opus mini ~$0.10/batch + Opus final ~$1 */
  estimatedCostUSD: number;
  estimatedSeconds: number;
}

/**
 * 預估執行時間與成本。讓 UI 可以在使用者按下「開始」前先告知。
 */
export async function estimatePipeline(
  userId: string
): Promise<PipelineEstimate> {
  const [totalChunks, pendingAnnotation] = await Promise.all([
    db.conversationChunk.count({ where: { uploadedChat: { userId } } }),
    db.conversationChunk.count({
      where: { uploadedChat: { userId }, annotatedAt: null },
    }),
  ]);

  // map-reduce 階段：以「全部 chunk × ~70% 達到 importance>=4 / 平均跨 5 種 chatType / 每批 30」估算
  const usableEstimate = Math.round(totalChunks * 0.7);
  const batches = Math.max(1, Math.ceil(usableEstimate / 30));

  const annotationCost = pendingAnnotation * 0.001;
  const miniCost = batches * 0.1;
  const finalCost = 1.0;

  // 時間：Haiku 平均 1s/chunk，併發 8；Opus 平均 5s/batch
  const annotationSeconds = (pendingAnnotation / 8) * 1.5;
  const extractSeconds = batches * 5 + 8;

  return {
    totalChunks,
    pendingAnnotation,
    estimatedMiniPersonaBatches: batches,
    estimatedCostUSD: Number(
      (annotationCost + miniCost + finalCost).toFixed(2)
    ),
    estimatedSeconds: Math.ceil(annotationSeconds + extractSeconds),
  };
}
