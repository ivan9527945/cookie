'use client';

import { useEffect, useState } from 'react';

interface EvidenceChunk {
  id: string;
  score: number;
  summary: string;
  yourPosition: string | null;
  topics: string[];
  importance: number;
}

interface EvidenceDrawerProps {
  query: string | null;
  onClose: () => void;
}

/**
 * T-109 證據面板（輕版）：點 persona 條目時打開，用 semantic search 找最相似的 chunks。
 * 不是「歸納依據」是「相似片段」——讓使用者自己判斷這個歸納合不合理。
 */
export function EvidenceDrawer({ query, onClose }: EvidenceDrawerProps) {
  const [chunks, setChunks] = useState<EvidenceChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChunks([]);
    fetch(`/api/persona/evidence?q=${encodeURIComponent(query)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`evidence ${r.status}`);
        return r.json();
      })
      .then((json: { chunks: EvidenceChunk[] }) => {
        if (!cancelled) setChunks(json.chunks);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <header className="space-y-1 border-b border-neutral-200 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            evidence · semantic match
          </p>
          <h2 className="text-base text-neutral-900">「{query}」</h2>
          <p className="text-[11px] text-neutral-400">
            這些片段在語義上相似，不是「Cookie 是因為這幾段才這樣歸納」。自己判斷合不合理。
          </p>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-neutral-400">搜尋中…</p>
          ) : error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : chunks.length === 0 ? (
            <p className="text-sm text-neutral-400">沒有找到相似片段。</p>
          ) : (
            chunks.map((c) => (
              <article
                key={c.id}
                className="space-y-1 rounded-md border border-neutral-200 bg-white p-3"
              >
                <div className="flex items-baseline justify-between text-[10px] text-neutral-400">
                  <span className="font-mono">
                    similarity {(c.score * 100).toFixed(0)}% · importance{' '}
                    {c.importance}/10
                  </span>
                </div>
                <p className="text-sm text-neutral-800">{c.summary}</p>
                {c.yourPosition ? (
                  <p className="text-xs text-neutral-600">
                    立場：{c.yourPosition}
                  </p>
                ) : null}
                {c.topics.length > 0 ? (
                  <p className="text-[11px] text-neutral-400">
                    {c.topics.map((t) => `#${t}`).join(' ')}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>

        <footer className="border-t border-neutral-200 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            關閉
          </button>
        </footer>
      </aside>
    </div>
  );
}
