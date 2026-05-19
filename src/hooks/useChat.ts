'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import type { ChatTurn } from '@/types/chat';

export interface UseChatReturn {
  history: ChatTurn[];
  pending: string;
  isStreaming: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const setMode = useCookieState((s) => s.setMode);
  const pulse = useCookieState((s) => s.pulse);

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: 恢復這個 session 的歷史
  useEffect(() => {
    let cancelled = false;
    fetch('/api/chat/history')
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages: ChatTurn[] }) => {
        if (!cancelled) setHistory(data.messages);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setHistory((h) => [...h, { role: 'user', content: trimmed }]);
      setIsStreaming(true);
      setMode('thinking');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`${res.status}: ${errText}`);
        }
        if (!res.body) throw new Error('no response body');

        setMode('speaking');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          pulse();
          setPending(buffer);
        }

        // 最後再 decode 一次清空 buffer
        buffer += decoder.decode();
        setHistory((h) => [...h, { role: 'assistant', content: buffer }]);
        setPending('');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsStreaming(false);
        setMode('idle');
      }
    },
    [isStreaming, pulse, setMode]
  );

  return { history, pending, isStreaming, error, send };
}
