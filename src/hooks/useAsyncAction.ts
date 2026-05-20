'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * 包一個 async handler：
 *   - pending 期間第二次呼叫直接 no-op（用 ref 同步閘，不靠 React 狀態 race）
 *   - 同步暴露 boolean 給 UI（按鈕 disabled / spinner）
 *   - run 永遠不會丟例外給呼叫端——例外被 swallow 後回傳 undefined，避免雙保險：
 *     真要拿 error 的話，自己在 fn 內部 try/catch 或回傳結果型別
 */
export function useAsyncAction<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
): {
  pending: boolean;
  run: (...args: Args) => Promise<R | undefined>;
} {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      if (pendingRef.current) return undefined;
      pendingRef.current = true;
      setPending(true);
      try {
        return await fn(...args);
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [fn]
  );

  return { pending, run };
}
