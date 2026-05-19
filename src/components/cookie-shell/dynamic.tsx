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
