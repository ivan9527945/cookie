'use client';

import { useCallback, useState } from 'react';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import type { ChatTurn } from '@/types/chat';

export interface UseChatReturn {
  history: ChatTurn[];
  pending: string;
  isStreaming: boolean;
  send: (text: string) => Promise<void>;
}

export function useChat(sessionId?: string): UseChatReturn {
  const setMode = useCookieState((s) => s.setMode);
  const pulse = useCookieState((s) => s.pulse);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userTurn: ChatTurn = { role: 'user', content: text };
      setHistory((h) => [...h, userTurn]);
      setIsStreaming(true);
      setMode('thinking');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: text }),
        });
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

        setHistory((h) => [...h, { role: 'assistant', content: buffer }]);
        setPending('');
      } finally {
        setIsStreaming(false);
        setMode('idle');
      }
    },
    [isStreaming, pulse, sessionId, setMode]
  );

  return { history, pending, isStreaming, send };
}
