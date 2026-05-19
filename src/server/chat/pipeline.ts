import { anthropic, MODELS } from '@/lib/anthropic';
import { buildSystemPrompt } from './system-prompt';
import { retrieveMemories } from '@/server/memory/retrieve';
import { getActivePersona } from '@/server/persona/update';
import type { ChatTurn } from '@/types/chat';

export interface ChatPipelineInput {
  userId: string;
  yourName: string;
  history: ChatTurn[];
  message: string;
}

export interface ChatPipelineContext {
  systemPrompt: string;
  retrievedChunkIds: string[];
  retrievedEpisodeIds: string[];
}

/** 組合 system prompt + retrieved memory，回傳可直接餵給 anthropic.messages.stream 的 payload */
export async function prepareChatTurn(input: ChatPipelineInput) {
  const persona = await getActivePersona(input.userId);
  if (!persona) {
    throw new Error('No active persona profile for user');
  }

  const memories = await retrieveMemories(input.message, input.userId);

  const memoryContext =
    memories.chunks.length === 0 && memories.episodes.length === 0
      ? ''
      : `\n\n[相關記憶]\n${[
          ...memories.chunks.map((c) => `· ${c.summary}`),
          ...memories.episodes.map((e) => `· ${e.summary}`),
        ].join('\n')}`;

  const systemPrompt = buildSystemPrompt(persona, input.yourName) + memoryContext;

  return {
    systemPrompt,
    retrievedChunkIds: memories.chunks.map((c) => c.id),
    retrievedEpisodeIds: memories.episodes.map((e) => e.id),
    request: {
      model: MODELS.primary,
      system: systemPrompt,
      messages: [
        ...input.history.map((t) => ({
          role: t.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: t.content,
        })),
        { role: 'user' as const, content: input.message },
      ],
      max_tokens: 1024,
    },
  };
}

export { anthropic };
