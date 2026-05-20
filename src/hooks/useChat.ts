'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import type {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatMode,
  RetrievedCount,
} from '@/types/chat';

export interface UseChatReturn {
  history: ChatHistoryMessage[];
  pending: string;
  pendingRetrieved: RetrievedCount | null;
  isStreaming: boolean;
  error: string | null;
  sessionId: string | null;
  send: (text: string, mode?: ChatMode) => Promise<void>;
  cancel: () => void;
  newSession: () => Promise<void>;
}

export function useChat(): UseChatReturn {
  const setMode = useCookieState((s) => s.setMode);
  const pulse = useCookieState((s) => s.pulse);

  const [history, setHistory] = useState<ChatHistoryMessage[]>([]);
  const [pending, setPending] = useState('');
  const [pendingRetrieved, setPendingRetrieved] =
    useState<RetrievedCount | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (!res.ok) return;
      const data = (await res.json()) as ChatHistoryResponse;
      setHistory(data.messages);
      setSessionId(data.session?.id ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const send = useCallback(
    async (text: string, chatMode: ChatMode = 'mirror') => {
      const trimmed = text.trim();
      if (!trimmed || isStreamingRef.current) return;
      isStreamingRef.current = true;

      setError(null);
      const userMessage: ChatHistoryMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setHistory((h) => [...h, userMessage]);
      setIsStreaming(true);
      setMode('thinking');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, mode: chatMode }),
          signal: controller.signal,
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
          buffer += decoder.decode(value, { stream: true });
          pulse();
          setPending(buffer);
        }
        buffer += decoder.decode();

        // 串流結束後 reload history，把 retrievedCount 等 server 端的權威值帶回來
        await loadHistory();
        setPending('');
        setPendingRetrieved(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // 中斷：保留 pending 為當前累積值，server 端會自動 persist
          await loadHistory();
          setPending('');
          setPendingRetrieved(null);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        abortRef.current = null;
        isStreamingRef.current = false;
        setIsStreaming(false);
        setMode('idle');
      }
    },
    [loadHistory, pulse, setMode]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newSession = useCallback(async () => {
    if (isStreamingRef.current) cancel();
    try {
      const res = await fetch('/api/chat/session', { method: 'POST' });
      if (!res.ok) throw new Error(`new session failed: ${res.status}`);
      const data = (await res.json()) as { id: string; startedAt: string };
      setSessionId(data.id);
      setHistory([]);
      setPending('');
      setPendingRetrieved(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [cancel]);

  return {
    history,
    pending,
    pendingRetrieved,
    isStreaming,
    error,
    sessionId,
    send,
    cancel,
    newSession,
  };
}
