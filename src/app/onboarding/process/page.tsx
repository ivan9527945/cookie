'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicCookieShell } from '@/components/cookie-shell/dynamic';
import { ProcessingProgress } from '@/components/onboarding/ProcessingProgress';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';

const PHASES = [
  '解析 LINE 對話…',
  '切分對話片段…',
  '標註關鍵段落…',
  '抽取人格切面…',
  '組合 Persona Profile…',
];

export default function ProcessPage() {
  const setMode = useCookieState((s) => s.setMode);
  const [phase, setPhase] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setMode('thinking');
    const t = setInterval(() => {
      setPct((p) => {
        if (p >= 100) {
          setPhase((ph) => Math.min(PHASES.length - 1, ph + 1));
          return 0;
        }
        return p + 2;
      });
    }, 80);
    return () => {
      clearInterval(t);
      setMode('idle');
    };
  }, [setMode]);

  const finished = phase >= PHASES.length - 1 && pct >= 98;

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-2">
      <DynamicCookieShell variant="hero" className="h-full w-full" />
      <section className="flex flex-col justify-center gap-6 px-12">
        <h1 className="text-xl tracking-tight">Cookie 正在成形…</h1>
        <ProcessingProgress label={PHASES[phase]} value={pct} />
        <p className="text-xs text-neutral-500">
          這個過程通常需要幾分鐘到半小時，視對話量而定。你可以離開這個頁面再回來。
        </p>
        {finished ? (
          <Link
            href="/chat"
            className="mt-4 self-start rounded-full border border-neutral-900 px-6 py-2 text-sm transition hover:bg-neutral-900 hover:text-white"
          >
            我是誰？ →
          </Link>
        ) : null}
      </section>
    </div>
  );
}
