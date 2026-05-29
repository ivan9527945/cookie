/**
 * Persona pipeline 的「模擬模式」——僅供本地手動跑流程用。
 *
 * 由環境變數 NEXT_PUBLIC_PERSONA_MOCK=1 開啟。開啟後：
 *   - 完全不碰 DB、不呼叫 Claude / OpenAI
 *   - 用記憶體中的假進度模擬 標註(Haiku) → 抽取(Opus) → 完成 的過程
 *
 * 讓 /onboarding/process 的「開始生成」之後的畫面（進度條、狀態文案、完成跳轉）
 * 可以在沒有真實資料與 API 額度的情況下被完整走一遍。
 */

import { setStatus, getStatus, isRunning } from './status';

/** 模擬模式共用的固定 user key（不對應任何 DB 使用者）。 */
export const MOCK_USER_ID = 'mock-user';

const MOCK_TOTAL_CHUNKS = 248;

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_PERSONA_MOCK === '1';
}

export interface MockEstimate {
  totalChunks: number;
  pendingAnnotation: number;
  estimatedMiniPersonaBatches: number;
  estimatedCostUSD: number;
  estimatedSeconds: number;
}

export function mockEstimate(): MockEstimate {
  return {
    totalChunks: MOCK_TOTAL_CHUNKS,
    pendingAnnotation: MOCK_TOTAL_CHUNKS,
    estimatedMiniPersonaBatches: 6,
    estimatedCostUSD: 0.42,
    estimatedSeconds: 95,
  };
}

/**
 * 啟動一段假的 pipeline 進度。fire-and-forget：呼叫後立刻回，
 * 由 setInterval / setTimeout 在背景推進 in-memory status。
 */
export function startMockPipeline(): void {
  if (isRunning(MOCK_USER_ID)) return;

  setStatus(MOCK_USER_ID, {
    state: 'annotating',
    annotated: 0,
    totalChunks: MOCK_TOTAL_CHUNKS,
    message: '標註中（Haiku）…',
    startedAt: new Date().toISOString(),
  });

  let annotated = 0;
  const step = 26;

  const timer = setInterval(() => {
    annotated = Math.min(MOCK_TOTAL_CHUNKS, annotated + step);
    setStatus(MOCK_USER_ID, {
      state: 'annotating',
      annotated,
      totalChunks: MOCK_TOTAL_CHUNKS,
      message: `${annotated} / ${MOCK_TOTAL_CHUNKS} 段已標註`,
    });

    if (annotated >= MOCK_TOTAL_CHUNKS) {
      clearInterval(timer);

      // 進入抽取階段（Opus），停留約 3 秒。
      setStatus(MOCK_USER_ID, {
        state: 'extracting',
        annotated: MOCK_TOTAL_CHUNKS,
        totalChunks: MOCK_TOTAL_CHUNKS,
        message: '整合 mini-persona（Opus）…',
      });

      setTimeout(() => {
        setStatus(MOCK_USER_ID, {
          state: 'done',
          annotated: MOCK_TOTAL_CHUNKS,
          totalChunks: MOCK_TOTAL_CHUNKS,
          version: 1,
          message: '完成',
        });
      }, 3000);
    }
  }, 550);
}

export function mockStatus() {
  return getStatus(MOCK_USER_ID);
}
