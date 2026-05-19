'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicCookieShell } from '@/components/cookie-shell/dynamic';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import type { IngestResponse } from '@/types/ingest';

export default function ProcessPage() {
  const setMode = useCookieState((s) => s.setMode);
  const [result, setResult] = useState<IngestResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ingest_result');
    if (raw) {
      try {
        setResult(JSON.parse(raw) as IngestResponse);
      } catch {
        /* ignore */
      }
    }
    setMode('awakening');
    const t = setTimeout(() => setMode('idle'), 4000);
    return () => {
      clearTimeout(t);
      setMode('idle');
    };
  }, [setMode]);

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-neutral-600">
          還沒有匯入紀錄。請從 onboarding 開始。
        </p>
        <Link
          href="/onboarding"
          className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs"
        >
          回到上傳頁
        </Link>
      </main>
    );
  }

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-2">
      <DynamicCookieShell variant="hero" className="h-full w-full" />

      <section className="flex flex-col justify-center gap-6 px-12">
        <header className="space-y-2">
          <p className="text-xs tracking-widest text-neutral-500 uppercase">
            Cookie 已成形
          </p>
          <h1 className="text-2xl tracking-tight">第一層記憶已寫入</h1>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="對話檔" value={`${result.chats.length}`} />
          <Stat label="訊息" value={result.totalMessages.toLocaleString()} />
          <Stat label="切分後段落" value={result.totalChunks.toLocaleString()} />
        </dl>

        <ul className="space-y-1 text-xs text-neutral-500">
          {result.chats.map((c) => (
            <li key={c.uploadedChatId} className="flex justify-between">
              <span className="truncate">{c.chatRoom}</span>
              <span>
                {c.messageCount.toLocaleString()} 筆 · {c.chunkCount} 段
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-neutral-500">
          下一步是從這些段落抽取出 Cookie 認為的你（Week 3 工程：persona pipeline）。
          目前還沒接上，但你可以先看看資料層。
        </p>

        <div className="flex gap-3">
          <Link
            href="/persona"
            className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs hover:bg-neutral-900 hover:text-white"
          >
            看 Persona 剖面（空）
          </Link>
          <Link
            href="/chat"
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
          >
            進到對話介面
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-mono text-xl tracking-tight">{value}</dd>
    </div>
  );
}
