'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DynamicCookieShell } from '@/components/cookie-shell/dynamic';
import {
  useCookieState,
  AWAKENING_DURATION_MS,
} from '@/components/cookie-shell/hooks/useCookieState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { IngestResponse } from '@/types/ingest';
import type {
  GenerateStatus,
  GenerateState,
} from '@/server/persona/status';

const BILLING_INSUFFICIENT_CODE = 'billing_insufficient';
const ANTHROPIC_BILLING_URL = 'https://console.anthropic.com/settings/billing';

// 模擬模式（NEXT_PUBLIC_PERSONA_MOCK=1）：沒有真實匯入紀錄時，塞一份假的
// ingest_result，讓「開始生成」之後的畫面可以在本地完整跑一遍。
const MOCK_MODE = process.env.NEXT_PUBLIC_PERSONA_MOCK === '1';
const MOCK_INGEST_RESULT: IngestResponse = {
  userId: 'mock-user',
  totalMessages: 18432,
  totalChunks: 248,
  chats: [
    {
      uploadedChatId: 'mock-1',
      chatRoom: '與 A 的對話',
      messageCount: 12044,
      chunkCount: 160,
    },
    {
      uploadedChatId: 'mock-2',
      chatRoom: '大學群組',
      messageCount: 6388,
      chunkCount: 88,
    },
  ],
};

interface Estimate {
  totalChunks: number;
  pendingAnnotation: number;
  estimatedMiniPersonaBatches: number;
  estimatedCostUSD: number;
  estimatedSeconds: number;
}

export default function ProcessPage() {
  const router = useRouter();
  const setMode = useCookieState((s) => s.setMode);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [status, setStatus] = useState<GenerateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ingest_result');
    if (raw) {
      try {
        setResult(JSON.parse(raw) as IngestResponse);
      } catch {
        /* ignore */
      }
    } else if (MOCK_MODE) {
      setResult(MOCK_INGEST_RESULT);
    }
    setMode('awakening');
    // 對齊 store 的動畫總時長；加 200ms 緩衝，讓蛋形最後 smoothstep 完整跑完
    const t = setTimeout(() => setMode('idle'), AWAKENING_DURATION_MS + 200);
    return () => {
      clearTimeout(t);
      setMode('idle');
    };
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/persona/estimate')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Estimate | null) => {
        if (!cancelled && data) setEstimate(data);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await fetch('/api/persona/status');
      if (!r.ok) return;
      const s = (await r.json()) as GenerateStatus;
      setStatus(s);
      if (s.state === 'done' || s.state === 'error') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (s.state === 'done') {
          // 小延遲讓使用者看到「完成」狀態再跳轉
          // T-105：awakening 結束的高潮時刻直接導到 chat（鏡子的我），不是 persona
          setTimeout(() => router.push('/chat'), 1500);
        } else if (s.code === BILLING_INSUFFICIENT_CODE) {
          setShowBillingDialog(true);
          setMode('idle');
        } else {
          setError(s.message ?? 'unknown error');
        }
      }
    }, 1500);
  }

  const { pending: starting, run: startGenerate } = useAsyncAction(async () => {
    setError(null);
    setMode('thinking');
    const res = await fetch('/api/persona/generate', { method: 'POST' });
    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      setError(`啟動失敗：${res.status} ${text}`);
      setMode('idle');
      return;
    }
    startPolling();
  });

  const running =
    status?.state === 'annotating' || status?.state === 'extracting';
  const pct =
    status?.totalChunks && status.totalChunks > 0
      ? Math.min(100, ((status.annotated ?? 0) / status.totalChunks) * 100)
      : 0;

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-2">
      <DynamicCookieShell variant="hero" className="h-full w-full" />

      <section className="flex flex-col justify-center gap-6 overflow-y-auto px-12 py-8">
        {result ? (
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              已寫入記憶層
            </p>
            <h1 className="text-2xl tracking-tight">第一層成形</h1>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <Stat label="對話檔" value={`${result.chats.length}`} />
              <Stat
                label="訊息"
                value={result.totalMessages.toLocaleString()}
              />
              <Stat
                label="段落"
                value={result.totalChunks.toLocaleString()}
              />
            </dl>
          </header>
        ) : (
          <header className="space-y-2">
            <h1 className="text-xl tracking-tight text-neutral-600">
              還沒有匯入紀錄。
            </h1>
            <Link
              href="/onboarding"
              className="text-xs underline underline-offset-4"
            >
              回到上傳頁
            </Link>
          </header>
        )}

        {result ? (
          <section className="space-y-4 border-t border-neutral-200 pt-6">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">
                下一步
              </p>
              <h2 className="text-lg tracking-tight">生成 Persona</h2>
              <p className="text-xs text-neutral-500">
                從你的對話歸納人格畫像。Claude Haiku 標註每段，Opus 抽出 mini-persona
                再整合。流程可重跑，每次會新增一個 version。
              </p>
            </div>

            {estimate ? (
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <Stat
                  label="待標註"
                  value={`${estimate.pendingAnnotation} / ${estimate.totalChunks}`}
                />
                <Stat
                  label="預估費用"
                  value={`$${estimate.estimatedCostUSD.toFixed(2)}`}
                />
                <Stat
                  label="預估時間"
                  value={formatSeconds(estimate.estimatedSeconds)}
                />
              </dl>
            ) : null}

            {status && status.state !== 'idle' ? (
              <div className="space-y-2">
                <Progress label={describeState(status.state)} pct={pct} />
                <p className="text-xs text-neutral-500">
                  {status.message ??
                    (status.totalChunks
                      ? `${status.annotated ?? 0} / ${status.totalChunks} 段已標註`
                      : '準備中…')}
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button
                onClick={() => void startGenerate()}
                loading={starting || running}
                loadingText="進行中…"
                className="rounded-full border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-40"
              >
                開始生成
              </Button>
              <Link
                href="/persona"
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
              >
                看現有 Persona
              </Link>
            </div>
          </section>
        ) : null}

        {result ? (
          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer">已寫入的對話檔</summary>
            <ul className="mt-2 space-y-1">
              {result.chats.map((c) => (
                <li
                  key={c.uploadedChatId}
                  className="flex justify-between gap-3"
                >
                  <span className="truncate">{c.chatRoom}</span>
                  <span className="font-mono">
                    {c.messageCount.toLocaleString()} 筆 · {c.chunkCount} 段
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anthropic API 額度不足</DialogTitle>
            <DialogDescription>
              生成 persona 需要呼叫 Claude（Haiku 標註、Opus
              整合）。目前的 API key 餘額已耗盡，請先充值後再重試。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            {status?.message ??
              '訊息：credit balance is too low to access the Anthropic API.'}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowBillingDialog(false)}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
            >
              稍後再說
            </button>
            <a
              href={ANTHROPIC_BILLING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowBillingDialog(false)}
              className="rounded-full border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-xs text-white hover:opacity-90"
            >
              前往 Anthropic 充值
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function describeState(s: GenerateState): string {
  switch (s) {
    case 'annotating':
      return '標註中（Haiku）';
    case 'extracting':
      return '抽取人格切面（Opus）';
    case 'done':
      return '完成';
    case 'error':
      return '發生錯誤';
    default:
      return '待機';
  }
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `~${secs} 秒`;
  const mins = Math.round(secs / 60);
  return `~${mins} 分鐘`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="font-mono text-base tracking-tight">{value}</dd>
    </div>
  );
}

function Progress({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>{label}</span>
        <span className="font-mono">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full bg-neutral-900 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
