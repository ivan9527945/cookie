'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [purging, setPurging] = useState(false);

  async function purgeAll() {
    if (!confirm('確定要清空全部資料？此動作無法復原。')) return;
    setPurging(true);
    await fetch('/api/memory', { method: 'DELETE' });
    setPurging(false);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-2xl tracking-tight">設定</h1>
        <p className="mt-1 text-xs text-neutral-500">
          資料主權在你。任何時候都可以清除所有訓練資料與生成的記憶。
        </p>
      </header>

      <section className="space-y-3 border-t border-neutral-200 pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          危險區域
        </h2>
        <button
          onClick={purgeAll}
          disabled={purging}
          className="rounded-md border border-red-500 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          {purging ? '清除中…' : '清空全部資料'}
        </button>
      </section>
    </main>
  );
}
