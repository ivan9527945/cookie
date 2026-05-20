'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type AuditAction =
  | 'upload_chat'
  | 'delete_chat'
  | 'generate_persona'
  | 'edit_persona'
  | 'chat_session_start'
  | 'data_export'
  | 'data_purge';

interface AuditEntry {
  id: string;
  action: AuditAction;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  upload_chat: '上傳對話',
  delete_chat: '刪除對話',
  generate_persona: '生成 persona',
  edit_persona: '修正 persona',
  chat_session_start: '與 Cookie 對話',
  data_export: '匯出資料',
  data_purge: '清除資料',
};

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) throw new Error(`audit ${res.status}`);
      const json = (await res.json()) as AuditResponse;
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

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          儀器 · 打開看裡面齒輪
        </p>
        <h1 className="text-2xl tracking-tight">操作軌跡</h1>
        <p className="text-xs text-neutral-500">
          Cookie 為你做過的每一件事都在這裡。
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
      ) : data && data.entries.length === 0 ? (
        <EmptyState />
      ) : data ? (
        <ol className="space-y-2">
          {data.entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-md border border-neutral-200 bg-white"
            >
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-neutral-50"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-neutral-400">
                    {formatTime(entry.createdAt)}
                  </span>
                  <span className="text-sm text-neutral-800">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-300">
                    {entry.action}
                  </span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  {expanded.has(entry.id) ? '▾' : '▸'}
                </span>
              </button>
              {expanded.has(entry.id) ? (
                <pre className="overflow-x-auto border-t border-neutral-100 bg-neutral-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-neutral-700">
                  {entry.details === null
                    ? '(no details)'
                    : JSON.stringify(entry.details, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-400">
        <Link href="/persona" className="hover:text-neutral-900">
          ← persona
        </Link>
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
      還沒有任何操作。
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
