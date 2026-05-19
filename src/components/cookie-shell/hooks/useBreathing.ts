'use client';

import { useMemo } from 'react';

/** 回傳一個會依時間生成 0..1 呼吸值的函式 */
export function useBreathing(periodSec = 4) {
  return useMemo(
    () => (t: number) => Math.sin((t * Math.PI * 2) / periodSec) * 0.5 + 0.5,
    [periodSec]
  );
}
