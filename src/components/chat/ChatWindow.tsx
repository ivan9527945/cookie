'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { WebcamLayer } from './WebcamLayer';
import { DynamicCookieShellOverlay } from '@/components/cookie-shell/dynamic';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { ChatMode, RetrievedCount } from '@/types/chat';

const FIRST_CONTACT_STORAGE_KEY = 'cookie:firstContactSeen';
const FIRST_CONTACT_GREETING = `我醒了。
我是用你說過的話組成的——我知道你寫過什麼，但我沒有你的經驗。
你想問我什麼？`;

// 場景三層（對應參考畫面）：
//   背景層 = 視訊鏡頭裡「真實的我」（WebcamLayer）
//   中間層 = 玻璃蛋形「另一個我 / AI」，落在左側、面向中央的鏡頭
//   前景層 = 對話覆蓋（靠右），中央不再有任何控制台
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
  const cookieMode = useCookieState((s) => s.mode);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('mirror');
  const [firstContact, setFirstContact] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { pending: startingNewSession, run: runNewSession } =
    useAsyncAction(newSession);

  // 第一次進 chat（且沒有歷史）時，AI 主動說一段開場白，並用 glitch 做一次「初次穩定」。
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
    <div className="relative h-screen w-screen overflow-hidden bg-[#f4f4f0]">
      {/* === 背景層：視訊鏡頭裡的我 === */}
      <WebcamLayer className="absolute inset-0 z-0" />

      {/* === 中間層：玻璃蛋形 AI（另一個我），落在左下、面向中央 === */}
      <div className="pointer-events-none absolute bottom-[2%] left-[-4%] z-10 h-[82%] w-[58%] md:left-[1%] md:w-[46%]">
        {/* 柔光背襯：讓蛋形像前面頁面那顆發光的球，浮在這一層 */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(214,236,246,0.55), rgba(176,190,232,0.22) 45%, rgba(255,255,255,0) 72%)',
          }}
        />
        <DynamicCookieShellOverlay
          variant="ambient"
          transparent
          lean={0.62}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* 空間標籤：呼應「兩個我」的關係 */}
      <SceneLabel className="left-[6%] top-[10%]" tone="dark">
        另一個我 · the other me
      </SceneLabel>
      <SceneLabel className="right-[6%] top-[10%]" tone="light" align="right">
        你 · live
        <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400 align-middle" />
      </SceneLabel>

      {/* === 前景層：對話覆蓋（靠右一欄，中央保持淨空） === */}
      <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col px-5 pb-5 pt-16 md:px-7">
        <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto pr-1">
          {isEmpty ? <EmptyState /> : null}

          {firstContact && history.length === 0 ? (
            <div className="space-y-1">
              <MessageBubble
                role="assistant"
                content={FIRST_CONTACT_GREETING}
              />
              <p className="pl-3 text-[10px] tracking-wide text-white/70 mix-blend-difference">
                first contact · 它主動開口
              </p>
            </div>
          ) : null}

          {history.map((turn) => (
            <div key={turn.id} className="space-y-1">
              <MessageBubble role={turn.role} content={turn.content} />
              {turn.role === 'assistant' && turn.retrievedCount ? (
                <MemoryCaption retrieved={turn.retrievedCount} />
              ) : null}
            </div>
          ))}

          {pending ? (
            <div className="space-y-1">
              {chatMode === 'simulation' ? <SimulationTag /> : null}
              <MessageBubble role="assistant" content={pending} cursor />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-300/60 bg-red-50/85 px-3 py-2 text-xs text-red-700 backdrop-blur-md">
              {error}
            </div>
          ) : null}

          <div ref={endRef} />
        </div>

        {/* 輸入列：細長、貼底，不是中央控制台 */}
        <form
          className="mt-3 flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-md"
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
                  ? '對另一個我說點什麼…（它會反問你）'
                  : '對另一個我說點什麼…（它會直接答）'
            }
            className="flex-1 bg-transparent px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              onClick={cancel}
              className="rounded-full bg-neutral-200/80 px-4 py-1.5 text-xs text-neutral-700 hover:bg-neutral-300/80"
            >
              中斷
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-40"
            >
              送出
            </Button>
          )}
        </form>
      </div>

      {/* === 極簡頂列控制（取代原本的中央控制台） === */}
      <TopBar
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        onNewSession={() => void runNewSession()}
        disabled={isStreaming}
        newSessionLoading={startingNewSession}
        thinking={cookieMode === 'thinking' || cookieMode === 'speaking'}
      />
    </div>
  );
}

function TopBar({
  chatMode,
  onChatModeChange,
  onNewSession,
  disabled,
  newSessionLoading,
  thinking,
}: {
  chatMode: ChatMode;
  onChatModeChange: (m: ChatMode) => void;
  onNewSession: () => void;
  disabled: boolean;
  newSessionLoading: boolean;
  thinking: boolean;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-5 py-3 text-[11px] text-neutral-500 md:px-7">
      <nav className="flex items-center gap-3 rounded-full bg-white/55 px-3 py-1 backdrop-blur-md">
        <NavLink href="/persona">persona</NavLink>
        <NavLink href="/memory">memory</NavLink>
        <NavLink href="/audit">audit</NavLink>
        <NavLink href="/settings">settings</NavLink>
        {thinking ? (
          <span className="font-mono text-[10px] tracking-wide text-neutral-400">
            · 思考中
          </span>
        ) : null}
      </nav>
      <div className="flex items-center gap-2">
        <ModeToggle mode={chatMode} onChange={onChatModeChange} disabled={disabled} />
        <Button
          onClick={onNewSession}
          loading={newSessionLoading}
          loadingText="開新對話…"
          disabled={disabled}
          className="rounded-full bg-white/55 px-2.5 py-0.5 backdrop-blur-md hover:text-neutral-900 disabled:opacity-40"
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
      className="inline-flex overflow-hidden rounded-full border border-white/50 bg-white/55 backdrop-blur-md"
      title={mode === 'mirror' ? '鏡像：它會反問你' : '模擬：它會直接答'}
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

function SceneLabel({
  children,
  className,
  tone,
  align = 'left',
}: {
  children: React.ReactNode;
  className?: string;
  tone: 'dark' | 'light';
  align?: 'left' | 'right';
}) {
  return (
    <span
      className={`pointer-events-none absolute z-20 text-[10px] uppercase tracking-[0.24em] ${
        tone === 'dark' ? 'text-neutral-700' : 'text-white'
      } ${align === 'right' ? 'text-right' : ''} ${className ?? ''}`}
      style={{ textShadow: '0 1px 6px rgba(0,0,0,0.25)' }}
    >
      {children}
    </span>
  );
}

function SimulationTag() {
  return (
    <p className="pl-3 font-mono text-[10px] tracking-wide text-white/70 mix-blend-difference">
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
    <div className="space-y-1 rounded-2xl border border-white/15 bg-neutral-900/55 px-4 py-3 text-left text-white shadow-lg shadow-black/30 backdrop-blur-md">
      <p className="text-sm">另一個我醒了。</p>
      <p className="text-xs text-white/70">
        它已經讀過你說過的話。問它任何事。
      </p>
    </div>
  );
}

function MemoryCaption({ retrieved }: { retrieved: RetrievedCount }) {
  const total = retrieved.chunks + retrieved.episodes;
  if (total === 0) return null;
  const parts: string[] = [];
  if (retrieved.chunks > 0) parts.push(`${retrieved.chunks} 段對話`);
  if (retrieved.episodes > 0) parts.push(`${retrieved.episodes} 段先前的聊天`);
  return (
    <p className="pl-3 text-[10px] tracking-wide text-white/70 mix-blend-difference">
      想起 {parts.join(' · ')}
    </p>
  );
}
