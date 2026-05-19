import Anthropic from '@anthropic-ai/sdk';

declare global {
  var __anthropic: Anthropic | undefined;
}

function getClient(): Anthropic {
  if (global.__anthropic) return global.__anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const client = new Anthropic({ apiKey });
  if (process.env.NODE_ENV !== 'production') {
    global.__anthropic = client;
  }
  return client;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
}) as Anthropic;

export const MODELS = {
  /** 主要對話模型 */
  primary: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
  /** 重型分析（mini-persona / final persona） */
  heavy: 'claude-opus-4-7',
  /** 低成本批次處理（chunk annotation / episodic extract） */
  light: 'claude-haiku-4-5-20251001',
} as const;
