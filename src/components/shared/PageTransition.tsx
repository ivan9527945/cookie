'use client';

// 路由轉場：以 pathname 為 key，讓每次換頁走「舊頁淡出 → 新頁淡入」的溶解效果，
// 取代瀏覽器預設那種瞬間切頁的頓感，營造像進入夢境般的漸入感。
//
// 為什麼只動畫 opacity：在 transform / filter 上做動畫會讓祖先元素變成
// containing block，使底下的 `position: fixed` 元素（chat 背景、EvidenceDrawer
// 模態框）定位錯亂，且 framer-motion 在靜止時仍會保留 inline style 而永久破壞。
// 純 opacity 溶解既安全，配合柔和緩動也足以撐起夢境感。

import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContext, useRef, type ReactNode } from 'react';

// App Router 換頁時會立刻把 children 換成新頁面，導致舊頁面無法播放 exit 動畫。
// FrozenRouter 在離場期間凍結舊的 router context，讓正在淡出的舊頁面維持原樣。
function FrozenRouter({ children }: { children: ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;

  if (!frozen) {
    return <>{children}</>;
  }

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // 尊重系統「減少動態效果」設定：直接切換、不做動畫。
  const enter = reduce
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.4, 0, 0.2, 1] as const };
  const leave = reduce
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.4, 0, 1, 1] as const };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: enter }}
        exit={{ opacity: 0, transition: leave }}
        style={{ minHeight: '100vh' }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
