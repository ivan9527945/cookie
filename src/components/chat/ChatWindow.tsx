'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';

export function ChatWindow() {
  const { history, pending, isStreaming, error, send } = useChat();
  const setMode = useCookieState((s) => s.setMode);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, pending]);

  return (
    <div className="flex h-full flex-col gap-4">
      <SystemMessage>這是一個用你的文字訓練出來的模仿物。它知道你說過的話，但它不是你。</SystemMessage>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {history.map((turn, i) => (
          <MessageBubble key={i} role={turn.role} content={turn.content} />
        ))}
        {pending ? <MessageBubble role="assistant" content={pending} /> : null}
        {error ? (
          <SystemMessage className="border-red-300 bg-red-50 text-red-700">
            {error}
          </SystemMessage>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 border-t border-neutral-200 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
          setInput('');
        }}
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setMode(e.target.value ? 'listening' : 'idle');
          }}
          placeholder="跟 Cookie 說點什麼…"
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          送出
        </button>
      </form>
    </div>
  );
}
