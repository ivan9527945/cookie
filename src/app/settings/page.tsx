'use client';

import { useState } from 'react';
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

export default function SettingsPage() {
  const [open, setOpen] = useState(false);
  const { pending: purging, run: confirmPurge } = useAsyncAction(async () => {
    try {
      await fetch('/api/memory', { method: 'DELETE' });
    } finally {
      setOpen(false);
    }
  });

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-2xl tracking-tight">設定</h1>
        <p className="mt-1 text-xs text-neutral-500">
          資料主權在你。任何時候都可以清除所有訓練資料與生成的記憶。
        </p>
      </header>

      <section className="space-y-3 border-t border-neutral-200 pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          危險區域
        </h2>
        <Button
          onClick={() => setOpen(true)}
          loading={purging}
          loadingText="清除中…"
          className="rounded-md border border-red-500 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          清空全部資料
        </Button>
      </section>

      <Dialog open={open} onOpenChange={(o) => !purging && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空全部資料</DialogTitle>
            <DialogDescription>
              這會刪除你上傳的 LINE 對話、所有 chunks、所有 persona 版本、所有 episodic
              memory 與 Qdrant 向量。此動作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              disabled={purging}
              className="rounded-md border border-neutral-300 px-4 py-1.5 text-xs text-neutral-700 hover:border-neutral-900 disabled:opacity-40"
            >
              取消
            </Button>
            <Button
              onClick={() => void confirmPurge()}
              loading={purging}
              loadingText="清除中…"
              className="rounded-md border border-red-500 bg-red-50 px-4 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40"
            >
              確認清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
