import { anthropic, MODELS } from '@/lib/anthropic';
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

export async function extractPersona(
  yourName: string,
  annotatedChunks: AnnotatedChunk[]
): Promise<PersonaProfile> {
  const byType = groupBy(annotatedChunks, (c) => c.chatType);
  const miniPersonas: MiniPersona[] = [];

  for (const [chatType, chunks] of Object.entries(byType)) {
    const sorted = chunks
      .filter((c) => c.importance >= 4)
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
            content: miniPersonaUserPrompt(chatType, yourName, batch),
          },
        ],
      });
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      miniPersonas.push(JSON.parse(text));
    }
  }

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
  });
  const finalText =
    final.content[0].type === 'text' ? final.content[0].text : '';
  const parsed = JSON.parse(finalText);

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
