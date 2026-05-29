'use client';

import dynamic from 'next/dynamic';

export const DynamicCookieShell = dynamic(
  () => import('./CookieShell').then((m) => m.CookieShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#F4F4F0]">
        <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-300" />
      </div>
    ),
  }
);

/**
 * 透明覆蓋用的載入器：fallback 不繪製不透明底色，避免疊在視訊鏡頭上時
 * 載入瞬間閃出一塊米色。搭配 <CookieShell transparent /> 使用。
 */
export const DynamicCookieShellOverlay = dynamic(
  () => import('./CookieShell').then((m) => m.CookieShell),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" />,
  }
);
