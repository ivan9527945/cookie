'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface EpisodeRow {
  id: string;
  sessionId: string;
  summary: string;
  importance: number;
  emotionalValence: number | null;
  createdAt: string;
}

interface MemoryResponse {
  episodes: EpisodeRow[];
  total: number;
}

export default function MemoryPage() {
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      const json = (await res.json()) as MemoryResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteOne(id: string) {
    if (!confirm('刪除這段記憶？Cookie 之後再也檢索不到。')) return;
    setBusy(id);
    try {
      await fetch(`/api/memory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function clearAll() {
    if (!confirm('清空 Cookie 對你的所有長期記憶？此動作軟刪不可救援。')) return;
    setBusy('all');
    try {
      await fetch('/api/memory', { method: 'DELETE' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          觀察 · 不依附
        </p>
        <h1 className="text-2xl tracking-tight">Cookie 還記得什麼</h1>
        <p className="text-xs text-neutral-500">
          這些是對話過程中 Cookie 自動抽出的長期記憶。
          你看到的就是它檢索時可用的全部。
          {data ? ` · 共 ${data.total} 筆` : ''}
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : data && data.episodes.length === 0 ? (
        <EmptyState />
      ) : data ? (
        <>
          <ul className="space-y-3">
            {data.episodes.map((ep) => (
              <li
                key={ep.id}
                className="space-y-2 rounded-md border border-neutral-200 bg-white p-3"
              >
                <p className="text-sm leading-relaxed text-neutral-800">
                  {ep.summary}
                </p>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-mono">
                    importance {ep.importance}/10
                    {ep.emotionalValence !== null
                      ? ` · valence ${ep.emotionalValence.toFixed(2)}`
                      : ''}
                    {' · '}
                    {new Date(ep.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteOne(ep.id)}
                    disabled={busy === ep.id}
                    className="text-red-600 hover:underline disabled:opacity-40"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-xs">
            <Link
              href="/chat"
              className="text-neutral-500 hover:text-neutral-900"
            >
              ← 回到對話
            </Link>
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={busy === 'all'}
              className="rounded border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              {busy === 'all' ? '清除中…' : '清空全部記憶'}
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
      還沒有長期記憶。
      <br />
      跟 Cookie 聊一段話，它會自動挑出值得記住的片段。
    </div>
  );
}
