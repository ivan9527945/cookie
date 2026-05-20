import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { writeAudit } from '@/server/audit';
import { annotateAllPending } from './annotate-batch';
import { BillingError, isAnthropicBillingMessage } from './errors';
import { extractPersona } from './extract';
import { setStatus } from './status';
import { embedAllPending } from '@/server/memory/embed-chunks';
import type { AnnotatedChunk, ChatType, EmotionalTone } from '@/types/line';

export interface PersonaSliceFilter {
  /** 只取此時點之後的訊息 */
  from?: Date;
  /** 只取此時點之前的訊息 */
  to?: Date;
  /** 只取指定 UploadedChat（單一聊天室或多選） */
  chatRoomIds?: string[];
}

export interface PersonaGenerateOptions {
  /** 切片條件：只用符合的 chunk 跑 persona */
  filter?: PersonaSliceFilter;
  /** 若 true：產出的 version 不會自動啟用、舊版也不會被 deactivate（純切片觀察） */
  asSlice?: boolean;
}

export interface PersonaGenerateResult {
  version: number;
  basedOnChunks: number;
  annotatedChunks: number;
  failedAnnotations: number;
  embedded: number;
  embeddingFailed: number;
}

/**
 * 完整 persona pipeline：
 *   1. annotate 所有 pending chunks（Haiku × N，併發 8）
 *   2. 從 DB 撈出已標註且 importance >= 4 的 chunks（可加 filter）
 *   3. extractPersona（map-reduce on Opus）
 *   4. 寫 PersonaProfile
 *      - 預設：version = max+1, isActive=true, 舊 active 變 inactive
 *      - asSlice=true：version = max+1, isActive=false, 舊版本不動（純觀察）
 *   5. 寫 audit log
 */
export async function runPersonaPipeline(
  userId: string,
  yourName: string,
  options: PersonaGenerateOptions = {}
): Promise<PersonaGenerateResult> {
  const startedAt = new Date().toISOString();
  setStatus(userId, { state: 'annotating', startedAt });

  try {
    return await runPipelineInner(userId, yourName, options);
  } catch (err) {
    // annotate-batch 已把餘額不足包成 BillingError；extract 階段如果也撞到，
    // Anthropic SDK 會丟原始錯誤訊息 — 在這裡統一比對訊息字串。
    if (err instanceof BillingError || isAnthropicBillingMessage(err)) {
      const msg =
        err instanceof BillingError ? err.message : new BillingError().message;
      setStatus(userId, {
        state: 'error',
        code: BillingError.CODE,
        message: msg,
      });
    }
    throw err;
  }
}

async function runPipelineInner(
  userId: string,
  yourName: string,
  options: PersonaGenerateOptions
): Promise<PersonaGenerateResult> {
  const { filter, asSlice = false } = options;

  // 全資料 annotate（切片仍然 annotate 全部，filter 只影響哪些進 extract）
  const annotateResult = await annotateAllPending(userId, yourName);

  const usable = await db.conversationChunk.findMany({
    where: {
      uploadedChat: {
        userId,
        ...(filter?.chatRoomIds && filter.chatRoomIds.length > 0
          ? { id: { in: filter.chatRoomIds } }
          : {}),
      },
      annotatedAt: { not: null },
      importance: { gte: 4 },
      ...(filter?.from || filter?.to
        ? {
            startTime: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
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
    const message = asSlice
      ? '這個切片範圍沒有任何符合的對話段落，換個日期或聊天室試試。'
      : '沒有符合條件的對話段落（importance >= 4）。' +
        '可能是 chunk 太少或都被判為閒聊。';
    setStatus(userId, { state: 'error', message });
    throw new Error(message);
  }

  setStatus(userId, {
    state: 'extracting',
    annotated: annotateResult.annotated,
    totalChunks: annotateResult.total,
  });

  // embedding 跟 extract 都不互相依賴；平行跑可省幾十秒。
  // 失敗只當 warning，persona 還是可以照常生成。
  const embedPromise = embedAllPending(userId).catch((err) => {
    console.warn('[persona] embed in background failed', err);
    return { total: 0, embedded: 0, failed: 0 };
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

  const profile = await extractPersona(userId, yourName, input, {
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

  // 取最高版本號（不只 active，避免切片時碰撞）
  const highest = await db.personaProfile.findFirst({
    where: { userId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  });
  const previous = await db.personaProfile.findFirst({
    where: { userId, isActive: true },
    select: { id: true, version: true },
  });
  const nextVersion = (highest?.version ?? 0) + 1;

  // 切片：把 filter 寫進 profile JSON 留痕，UI 可以辨識這是哪段時間的我
  const versionedProfile = {
    ...profile,
    version: nextVersion,
    ...(asSlice && filter
      ? {
          sliceFilter: {
            from: filter.from?.toISOString() ?? null,
            to: filter.to?.toISOString() ?? null,
            chatRoomIds: filter.chatRoomIds ?? null,
          },
        }
      : {}),
  };

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  // 切片不 deactivate active；主版本才會
  if (!asSlice && previous) {
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
        isActive: !asSlice,
        profile: versionedProfile as unknown as Prisma.InputJsonValue,
        basedOnMessages: input.length,
        generationModel: 'claude-opus-4-7',
      },
    })
  );
  await db.$transaction(updates);

  // 此時 extract 已完成；等 embed 收尾。通常 embed 更快、但有可能還在跑。
  const embedResult = await embedPromise;

  await writeAudit(userId, 'generate_persona', {
    version: nextVersion,
    basedOnChunks: input.length,
    annotated: annotateResult.annotated,
    failedAnnotations: annotateResult.failed,
    embedded: embedResult.embedded,
    embeddingFailed: embedResult.failed,
    ...(asSlice
      ? {
          slice: true,
          filter: {
            from: filter?.from?.toISOString() ?? null,
            to: filter?.to?.toISOString() ?? null,
            chatRoomIds: filter?.chatRoomIds ?? null,
          },
        }
      : {}),
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
    embedded: embedResult.embedded,
    embeddingFailed: embedResult.failed,
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
