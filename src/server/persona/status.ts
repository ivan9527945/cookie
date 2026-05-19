/**
 * Process-local 進度 store。dev 單一 Node process 夠用；
 * 上 Railway 後改 Redis 或 BullMQ。
 */

export type GenerateState =
  | 'idle'
  | 'annotating'
  | 'extracting'
  | 'done'
  | 'error';

export interface GenerateStatus {
  state: GenerateState;
  annotated?: number;
  totalChunks?: number;
  version?: number;
  message?: string;
  startedAt?: string;
  updatedAt: string;
}

const store = new Map<string, GenerateStatus>();

export function setStatus(
  userId: string,
  status: Omit<GenerateStatus, 'updatedAt'>
): void {
  const prev = store.get(userId);
  store.set(userId, {
    ...status,
    startedAt: status.startedAt ?? prev?.startedAt,
    updatedAt: new Date().toISOString(),
  });
}

export function getStatus(userId: string): GenerateStatus {
  return (
    store.get(userId) ?? {
      state: 'idle',
      updatedAt: new Date().toISOString(),
    }
  );
}

export function clearStatus(userId: string): void {
  store.delete(userId);
}

/** 判斷是否有 job 正在跑（避免重複觸發）*/
export function isRunning(userId: string): boolean {
  const s = store.get(userId);
  return s?.state === 'annotating' || s?.state === 'extracting';
}
