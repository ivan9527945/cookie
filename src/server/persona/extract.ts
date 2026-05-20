import { anthropic, MODELS, anthropicUserMeta } from '@/lib/anthropic';
import {
  PersonaProfileSchema,
  type MiniPersona,
  type PersonaProfile,
} from '@/types/persona';
import type { AnnotatedChunk } from '@/types/line';
import {
  MINI_PERSONA_SYSTEM,
  miniPersonaUserPrompt,
  FINAL_PERSONA_SYSTEM,
  finalPersonaUserPrompt,
} from './prompts';

const BATCH_SIZE = 30;
const MIN_IMPORTANCE = 4;

/** 過濾 verbatim quote 裡的常見 PII，避免人格畫像帶出敏感資訊 */
const PII_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g, // emails
  /\+?\d[\d -]{7,}\d/g, // phone-ish digits
];

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function scrubPII(s: string): string {
  let out = s;
  for (const p of PII_PATTERNS) out = out.replace(p, '<REDACTED>');
  return out;
}

function sanitizeMiniPersona(raw: MiniPersona): MiniPersona {
  return {
    ...raw,
    observations: {
      ...raw.observations,
      verbatimQuotes: raw.observations.verbatimQuotes.map(scrubPII),
    },
  };
}

export interface ExtractProgressEvent {
  stage: 'mini' | 'final';
  done: number;
  total: number;
  context?: string;
}

export interface ExtractOptions {
  onProgress?: (event: ExtractProgressEvent) => void;
}

export async function extractPersona(
  userId: string,
  yourName: string,
  annotatedChunks: AnnotatedChunk[],
  options: ExtractOptions = {}
): Promise<PersonaProfile> {
  const byType = groupBy(annotatedChunks, (c) => c.chatType);

  // 預計總 batch 數，用來算進度
  const totalBatches = Object.values(byType).reduce((acc, chunks) => {
    const usable = chunks.filter((c) => c.importance >= MIN_IMPORTANCE);
    return acc + Math.ceil(usable.length / BATCH_SIZE);
  }, 0);

  const miniPersonas: MiniPersona[] = [];
  let batchDone = 0;

  for (const [chatType, chunks] of Object.entries(byType)) {
    const sorted = chunks
      .filter((c) => c.importance >= MIN_IMPORTANCE)
      .sort((a, b) => b.importance - a.importance);

    for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
      const batch = sorted.slice(i, i + BATCH_SIZE);
      const res = await anthropic.messages.create({
        model: MODELS.heavy,
        max_tokens: 2000,
        system: MINI_PERSONA_SYSTEM,
        messages: [
          {
            role: 'user',
            content: miniPersonaUserPrompt(
              chatType,
              yourName,
              batch.map((b) => ({
                summary: b.summary,
                yourPosition: b.yourPosition,
                topics: b.topics,
              }))
            ),
          },
        ],
        metadata: anthropicUserMeta(userId),
      });
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      const parsed = JSON.parse(stripFences(text)) as MiniPersona;
      miniPersonas.push(sanitizeMiniPersona(parsed));
      batchDone += 1;
      options.onProgress?.({
        stage: 'mini',
        done: batchDone,
        total: totalBatches,
        context: chatType,
      });
    }
  }

  options.onProgress?.({ stage: 'final', done: 0, total: 1 });
  const final = await anthropic.messages.create({
    model: MODELS.heavy,
    max_tokens: 4000,
    system: FINAL_PERSONA_SYSTEM,
    messages: [
      {
        role: 'user',
        content: finalPersonaUserPrompt(yourName, miniPersonas),
      },
    ],
    metadata: anthropicUserMeta(userId),
  });
  const finalText =
    final.content[0].type === 'text' ? final.content[0].text : '';
  const parsed = JSON.parse(stripFences(finalText));
  options.onProgress?.({ stage: 'final', done: 1, total: 1 });

  return PersonaProfileSchema.parse({
    ...parsed,
    version: 1,
    generatedAt: new Date().toISOString(),
    basedOnMessages: annotatedChunks.length,
  });
}

function groupBy<T, K extends string>(
  arr: T[],
  fn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = fn(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}
