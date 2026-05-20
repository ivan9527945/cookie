'use client';

import { useEffect, useState } from 'react';

interface ChatRoom {
  id: string;
  chatRoom: string;
  chatType: 'private' | 'group';
  messageCount: number;
}

interface SliceFormProps {
  onCreated: () => void | Promise<void>;
}

interface GenerateStatus {
  state: 'idle' | 'annotating' | 'extracting' | 'done' | 'error';
  message?: string;
  annotated?: number;
  totalChunks?: number;
}

/**
 * T-110 切片生成表單。
 * 折疊在 persona 頁的 details，預設收起——這是探索性功能，不該每次都在主視線。
 */
export function SliceForm({ onCreated }: SliceFormProps) {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<GenerateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/chats')
      .then((r) => r.json())
      .then((j: { chats: ChatRoom[] }) => {
        if (!cancelled) setChats(j.chats);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    !submitting && (from !== '' || to !== '' || selectedChats.size > 0);

  function toggleChat(id: string) {
    setSelectedChats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    setStatus({ state: 'annotating' });

    try {
      const body: {
        from?: string;
        to?: string;
        chatRoomIds?: string[];
      } = {};
      if (from) body.from = new Date(from).toISOString();
      if (to) body.to = new Date(to).toISOString();
      if (selectedChats.size > 0) body.chatRoomIds = Array.from(selectedChats);

      const res = await fetch('/api/persona/slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      // poll status
      const interval = setInterval(async () => {
        const r = await fetch('/api/persona/status');
        if (!r.ok) return;
        const s = (await r.json()) as GenerateStatus;
        setStatus(s);
        if (s.state === 'done' || s.state === 'error') {
          clearInterval(interval);
          setSubmitting(false);
          if (s.state === 'done') {
            await onCreated();
            // reset form
            setFrom('');
            setTo('');
            setSelectedChats(new Set());
          } else {
            setError(s.message ?? 'pipeline error');
          }
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
      setStatus(null);
    }
  }

  return (
    <details className="rounded-md border border-neutral-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900">
        生成新切片（看不同時段 / 不同聊天室的我）
      </summary>
      <div className="space-y-3 border-t border-neutral-100 px-3 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-neutral-500">
            從
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={submitting}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-500">
            到
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={submitting}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        </div>

        {chats.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">
              聊天室（不選表示全部）
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-neutral-100 p-2">
              {chats.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selectedChats.has(c.id)}
                      onChange={() => toggleChat(c.id)}
                      disabled={submitting}
                    />
                    <span className="truncate">{c.chatRoom}</span>
                    <span className="ml-auto font-mono text-[10px] text-neutral-400">
                      {c.messageCount.toLocaleString()} ·{' '}
                      {c.chatType === 'group' ? '群組' : '一對一'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {status && status.state !== 'idle' && submitting ? (
          <p className="font-mono text-[11px] text-neutral-500">
            {status.state}
            {status.annotated && status.totalChunks
              ? ` · ${status.annotated}/${status.totalChunks}`
              : ''}
            {status.message ? ` · ${status.message}` : ''}
          </p>
        ) : null}

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-neutral-400">
            切片不會取代主版本，可從上方版本選單切過去查看。
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            {submitting ? '生成中…' : '生成切片'}
          </button>
        </div>
      </div>
    </details>
  );
}
