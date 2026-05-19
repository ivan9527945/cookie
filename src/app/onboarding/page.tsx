'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from '@/components/onboarding/FileDropzone';

export default function OnboardingPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (files.length === 0) return;
    setSubmitting(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const res = await fetch('/api/ingest', { method: 'POST', body: fd });
    setSubmitting(false);
    if (res.ok) router.push('/onboarding/process');
  }

  return (
    <>
      <header className="space-y-3">
        <h1 className="text-2xl tracking-tight">先把你的對話交給它</h1>
        <p className="text-sm text-neutral-600">
          上傳 LINE 匯出的 <code className="font-mono">.txt</code>{' '}
          檔。處理完成後原始檔案會在 24 小時內被刪除，只保留結構化資料。
        </p>
      </header>

      <FileDropzone onFiles={(fs) => setFiles((prev) => [...prev, ...fs])} />

      {files.length > 0 ? (
        <ul className="space-y-1 text-sm text-neutral-700">
          {files.map((f, i) => (
            <li key={i} className="flex justify-between">
              <span>{f.name}</span>
              <span className="text-neutral-400">
                {(f.size / 1024).toFixed(1)} KB
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {submitting ? '處理中…' : '開始處理'}
        </button>
      </div>
    </>
  );
}
