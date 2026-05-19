'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { GlitchText } from '@/components/shared/GlitchText';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import type { RetrievedCount } from '@/types/chat';

export function ChatWindow() {
  const {
    history,
    pending,
    isStreaming,
    error,
    send,
    cancel,
    newSession,
  } = useChat();
  const setMode = useCookieState((s) => s.setMode);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, pending]);

  const isEmpty = history.length === 0 && !pending && !isStreaming;

  return (
    <div className="flex h-full flex-col gap-4">
      <Toolbar
        onNewSession={() => void newSession()}
        disabled={isStreaming}
      />

      <SystemMessage>
        <GlitchText intensity={0.4}>
          這是一個用你的文字訓練出來的模仿物。它知道你說過的話，但它不是你。
        </GlitchText>
      </SystemMessage>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {isEmpty ? <EmptyState /> : null}

        {history.map((turn) => (
          <div key={turn.id} className="space-y-1">
            <MessageBubble role={turn.role} content={turn.content} />
            {turn.role === 'assistant' && turn.retrievedCount ? (
              <MemoryCaption
                retrieved={turn.retrievedCount}
                align="left"
              />
            ) : null}
          </div>
        ))}

        {pending ? (
          <div className="space-y-1">
            <MessageBubble
              role="assistant"
              content={pending}
              cursor
            />
          </div>
        ) : null}

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
            if (!isStreaming) {
              setMode(e.target.value ? 'listening' : 'idle');
            }
          }}
          placeholder={isStreaming ? '回應中…' : '跟 Cookie 說點什麼…'}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            中斷
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            送出
          </button>
        )}
      </form>
    </div>
  );
}

function Toolbar({
  onNewSession,
  disabled,
}: {
  onNewSession: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] text-neutral-500">
      <nav className="flex gap-3">
        <NavLink href="/persona">persona</NavLink>
        <NavLink href="/memory">memory</NavLink>
        <NavLink href="/settings">settings</NavLink>
      </nav>
      <button
        type="button"
        onClick={onNewSession}
        disabled={disabled}
        className="rounded-full border border-neutral-300 px-2.5 py-0.5 hover:border-neutral-700 hover:text-neutral-900 disabled:opacity-40"
      >
        新對話
      </button>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="lowercase tracking-widest hover:text-neutral-900"
    >
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 py-12 text-center">
      <p className="text-sm text-neutral-700">Cookie 醒了。</p>
      <p className="text-xs text-neutral-500">
        它已經讀過你說過的話。問它任何事。
      </p>
    </div>
  );
}

function MemoryCaption({
  retrieved,
  align,
}: {
  retrieved: RetrievedCount;
  align: 'left' | 'right';
}) {
  const total = retrieved.chunks + retrieved.episodes;
  if (total === 0) return null;
  const parts: string[] = [];
  if (retrieved.chunks > 0) parts.push(`${retrieved.chunks} 段對話`);
  if (retrieved.episodes > 0) parts.push(`${retrieved.episodes} 段先前的聊天`);
  return (
    <p
      className={`text-[10px] tracking-wide text-neutral-400 ${
        align === 'left' ? 'pl-3' : 'pr-3 text-right'
      }`}
    >
      想起 {parts.join(' · ')}
    </p>
  );
}
