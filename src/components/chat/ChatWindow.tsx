'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { GlitchText } from '@/components/shared/GlitchText';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { ChatMode, RetrievedCount } from '@/types/chat';

const FIRST_CONTACT_STORAGE_KEY = 'cookie:firstContactSeen';
const FIRST_CONTACT_GREETING = `我醒了。
我是用你說過的話組成的——我知道你寫過什麼，但我沒有你的經驗。
你想問我什麼？`;

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
  const [chatMode, setChatMode] = useState<ChatMode>('mirror');
  const [firstContact, setFirstContact] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { pending: startingNewSession, run: runNewSession } =
    useAsyncAction(newSession);

  // T-105：first-contact 儀式
  // 第一次進 chat（且沒有歷史）時，Cookie 主動說一段開場白，使用者再開口。
  // 旗標存 localStorage，使用者再回來不會重複看到。
  // 並用 Shell 的 glitch mode 做一次「初次穩定」視覺訊號。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (history.length > 0) return;
    if (localStorage.getItem(FIRST_CONTACT_STORAGE_KEY)) return;
    setFirstContact(true);
    localStorage.setItem(FIRST_CONTACT_STORAGE_KEY, '1');
    setMode('glitch');
    const t = setTimeout(() => setMode('idle'), 1800);
    return () => clearTimeout(t);
  }, [history.length, setMode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, pending]);

  const isEmpty =
    history.length === 0 && !pending && !isStreaming && !firstContact;

  return (
    <div className="flex h-full flex-col gap-4">
      <Toolbar
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        onNewSession={() => void runNewSession()}
        disabled={isStreaming}
        newSessionLoading={startingNewSession}
      />

      <SystemMessage>
        <GlitchText intensity={0.4}>
          這是一個用你的文字訓練出來的模仿物。它知道你說過的話，但它不是你。
        </GlitchText>
      </SystemMessage>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {isEmpty ? <EmptyState /> : null}

        {firstContact && history.length === 0 ? (
          <div className="space-y-1">
            <MessageBubble role="assistant" content={FIRST_CONTACT_GREETING} />
            <p className="pl-3 text-[10px] tracking-wide text-neutral-400">
              first contact · 它主動開口
            </p>
          </div>
        ) : null}

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
            {chatMode === 'simulation' ? <SimulationTag /> : null}
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
          void send(input, chatMode);
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
          placeholder={
            isStreaming
              ? '回應中…'
              : chatMode === 'mirror'
                ? '跟 Cookie 說點什麼…（它會反問你）'
                : '跟 Cookie 說點什麼…（它會直接答）'
          }
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            onClick={cancel}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            中斷
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            送出
          </Button>
        )}
      </form>
    </div>
  );
}

function Toolbar({
  chatMode,
  onChatModeChange,
  onNewSession,
  disabled,
  newSessionLoading,
}: {
  chatMode: ChatMode;
  onChatModeChange: (m: ChatMode) => void;
  onNewSession: () => void;
  disabled: boolean;
  newSessionLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] text-neutral-500">
      <nav className="flex items-center gap-3">
        <NavLink href="/persona">← persona</NavLink>
        <span className="text-neutral-300">·</span>
        <NavLink href="/memory">memory</NavLink>
        <NavLink href="/audit">audit</NavLink>
        <NavLink href="/settings">settings</NavLink>
      </nav>
      <div className="flex items-center gap-2">
        <ModeToggle mode={chatMode} onChange={onChatModeChange} disabled={disabled} />
        <Button
          onClick={onNewSession}
          loading={newSessionLoading}
          loadingText="開新對話…"
          disabled={disabled}
          className="rounded-full border border-neutral-300 px-2.5 py-0.5 hover:border-neutral-700 hover:text-neutral-900 disabled:opacity-40"
        >
          新對話
        </Button>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: ChatMode;
  onChange: (m: ChatMode) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-full border border-neutral-300"
      title={mode === 'mirror' ? '鏡像：Cookie 會反問你' : '模擬：Cookie 會直接答'}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('mirror')}
        className={`px-2.5 py-0.5 text-[10px] tracking-wide transition disabled:opacity-40 ${
          mode === 'mirror'
            ? 'bg-neutral-900 text-white'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        鏡像
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('simulation')}
        className={`px-2.5 py-0.5 text-[10px] tracking-wide transition disabled:opacity-40 ${
          mode === 'simulation'
            ? 'bg-neutral-900 text-white'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        模擬
      </button>
    </div>
  );
}

function SimulationTag() {
  return (
    <p className="pl-3 font-mono text-[10px] tracking-wide text-neutral-400">
      [模擬：根據你過去的回應推估]
    </p>
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
