import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';

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

/**
 * 把 Cookie 內部 userId 轉成穩定的 Anthropic metadata user_id。
 *
 * 用途：所有 messages.create / messages.stream 都帶上 `metadata: { user_id: ... }`，
 * 一方面對齊 Anthropic 對濫用追蹤的要求、一方面在 ZDR 啟用時這個欄位是 opaque hash 不會帶 PII。
 *
 * 為什麼是 sha256 + truncate：
 *  - userId 本身是 UUID，已經不是 PII，但 hash 後仍可作為「程式碼層級明示與 PII 解耦」的痕跡
 *  - Anthropic metadata.user_id 上限 256 字，32 hex char 夠唯一也好辨識
 */
export function anthropicUserMeta(userId: string): { user_id: string } {
  return {
    user_id: createHash('sha256').update(userId).digest('hex').slice(0, 32),
  };
}
