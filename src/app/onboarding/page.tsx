'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from '@/components/onboarding/FileDropzone';
import { DynamicHospitalRoom } from '@/components/onboarding/hospital-room/dynamic';
import type {
  FilePreview,
  IngestFileMeta,
  IngestResponse,
} from '@/types/ingest';

type Step = 'upload' | 'preview' | 'submitting';

interface PreviewState {
  preview: FilePreview;
  file: File;
  chatRoom: string;
  chatType: 'private' | 'group';
  notes: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [items, setItems] = useState<PreviewState[]>([]);
  const [selfName, setSelfName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const speakerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      for (const s of it.preview.speakers) {
        counts.set(s.name, (counts.get(s.name) ?? 0) + s.messageCount);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, c]) => ({ name, count: c }));
  }, [items]);

  async function handleFiles(files: File[]) {
    setError(null);
    setStep('submitting');

    const fd = new FormData();
    for (const f of files) fd.append('files', f);

    try {
      const res = await fetch('/api/ingest/preview', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(`preview ${res.status}`);
      const { files: previews } = (await res.json()) as { files: FilePreview[] };
      const next = previews.map((p, i) => ({
        preview: p,
        file: files[i],
        chatRoom: p.chatRoom,
        chatType: p.detectedType,
        notes: '',
      }));
      setItems((prev) => [...prev, ...next]);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('upload');
    }
  }

  async function submitIngest() {
    if (!selfName.trim() || items.length === 0) return;
    setStep('submitting');
    setError(null);

    const fd = new FormData();
    const meta: { selfName: string; files: IngestFileMeta[] } = {
      selfName: selfName.trim(),
      files: items.map((it) => ({
        filename: it.preview.filename,
        chatRoom: it.chatRoom.trim() || it.preview.filename,
        chatType: it.chatType,
        notes: it.notes.trim() || undefined,
      })),
    };
    fd.append('meta', JSON.stringify(meta));
    for (const it of items) fd.append('files', it.file);

    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`ingest ${res.status}: ${txt}`);
      }
      const result = (await res.json()) as IngestResponse;
      sessionStorage.setItem('ingest_result', JSON.stringify(result));
      router.push('/onboarding/process');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('preview');
    }
  }

  if (items.length === 0) {
    return (
      <div className="relative h-screen w-full overflow-hidden">
        {/* 3D 病房場景做為背景 */}
        <div className="absolute inset-0">
          <DynamicHospitalRoom />
        </div>

        {/* 頂部資訊 */}
        <header className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-2xl space-y-2 px-6 pt-10 text-neutral-800 mix-blend-multiply">
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            intake · operating theater
          </p>
          <h1 className="text-2xl tracking-tight">先把你的對話交給它</h1>
          <p className="text-sm text-neutral-600">
            上傳 LINE 匯出的 <code className="font-mono">.txt</code>{' '}
            檔。原始檔案不會被儲存，解析完即丟棄，只保留結構化訊息。
          </p>
        </header>

        {error ? (
          <div className="absolute inset-x-0 top-44 z-10 mx-auto w-full max-w-2xl px-6">
            <div className="rounded-md border border-red-300 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          </div>
        ) : null}

        {/* Dropzone — 透明點擊區，蓋住整個病床範圍 */}
        <div
          className="absolute left-1/2 top-[56%] z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'min(820px, 78vw)',
            height: 'min(360px, 48vh)',
          }}
        >
          <FileDropzone onFiles={handleFiles} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 3D 病房場景（與 upload 共用） */}
      <div className="absolute inset-0">
        <DynamicHospitalRoom />
      </div>

      {/* 浮在床上方的玻璃感卡片堆疊（可捲動） */}
      <div className="relative z-10 mx-auto flex h-screen w-full max-w-2xl flex-col gap-5 overflow-y-auto px-6 py-10">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            preview · pending intake
          </p>
          <h1 className="text-2xl tracking-tight">確認檢體資訊</h1>
          <p className="text-sm text-neutral-600">
            確認以下對話檔案後再進入處理流程。
          </p>
        </header>

        {error ? (
          <div
            className="rounded-md border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-700 backdrop-blur-sm"
            style={{
              boxShadow: '0 6px 18px -10px rgba(180, 30, 30, 0.3)',
            }}
          >
            {error}
          </div>
        ) : null}

        <ul className="space-y-3">
          {items.map((it, i) => (
            <li
              key={i}
              className="space-y-2 rounded-xl border border-white/60 bg-white/55 p-4 backdrop-blur-md"
              style={{
                boxShadow:
                  '0 14px 36px -16px rgba(70, 80, 85, 0.35), 0 2px 6px rgba(70, 80, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
              }}
            >
              <div className="flex items-baseline justify-between text-xs text-neutral-500">
                <span className="font-mono">{it.preview.filename}</span>
                <span>
                  {it.preview.messageCount.toLocaleString()} 筆 ·{' '}
                  {(it.preview.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>

              <label className="block text-xs text-neutral-500">
                聊天室名稱
                <input
                  value={it.chatRoom}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, chatRoom: e.target.value } : x
                      )
                    )
                  }
                  className="mt-1 block w-full rounded-md border border-white/70 bg-white/60 px-2 py-1 text-sm text-neutral-900 backdrop-blur-sm focus:border-neutral-400 focus:outline-none"
                />
              </label>

              <div className="flex gap-4 text-xs text-neutral-500">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`type-${i}`}
                    checked={it.chatType === 'private'}
                    onChange={() =>
                      setItems((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, chatType: 'private' } : x
                        )
                      )
                    }
                  />
                  一對一
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`type-${i}`}
                    checked={it.chatType === 'group'}
                    onChange={() =>
                      setItems((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, chatType: 'group' } : x
                        )
                      )
                    }
                  />
                  群組
                </label>
                <span className="ml-auto text-neutral-400">
                  {it.preview.speakers
                    .slice(0, 3)
                    .map((s) => `${s.name}（${s.messageCount}）`)
                    .join(' · ')}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <section
          className="space-y-2 rounded-xl border border-white/60 bg-white/45 p-4 backdrop-blur-md"
          style={{
            boxShadow:
              '0 14px 36px -16px rgba(70, 80, 85, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
          }}
        >
          <label className="block text-xs text-neutral-500">
            在 LINE 上你顯示的名字
          </label>
          <div className="flex flex-wrap gap-2">
            {speakerOptions.slice(0, 6).map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelfName(s.name)}
                className={`rounded-full border px-3 py-1 text-xs backdrop-blur-sm transition ${
                  selfName === s.name
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-white/70 bg-white/55 text-neutral-700 hover:border-neutral-500 hover:bg-white/75'
                }`}
              >
                {s.name}
                <span className="ml-1 text-[10px] opacity-60">
                  {s.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          <input
            value={selfName}
            onChange={(e) => setSelfName(e.target.value)}
            placeholder="或自行輸入"
            className="block w-full rounded-md border border-white/70 bg-white/60 px-2 py-1 text-sm backdrop-blur-sm focus:border-neutral-400 focus:outline-none"
          />
        </section>

        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setSelfName('');
              setStep('upload');
            }}
            className="text-xs text-neutral-500 transition hover:text-neutral-900"
            style={{
              textShadow: '0 1px 2px rgba(255,255,255,0.5)',
            }}
          >
            重新選擇
          </button>
          <button
            type="button"
            onClick={submitIngest}
            disabled={
              !selfName.trim() ||
              items.length === 0 ||
              step === 'submitting'
            }
            className="rounded-full border border-neutral-900 bg-neutral-900 px-5 py-2 text-sm text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)] transition disabled:opacity-40"
          >
            {step === 'submitting' ? '處理中…' : '開始處理'}
          </button>
        </div>
      </div>
    </div>
  );
}
