'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  className?: string;
}

export function FileDropzone({ onFiles, accept = '.txt', className }: Props) {
  const [active, setActive] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <label
      className={cn(
        'flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition',
        active
          ? 'border-neutral-900 bg-neutral-50'
          : 'border-neutral-300 bg-white hover:border-neutral-500',
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      <p className="text-sm text-neutral-600">把 LINE 匯出的 .txt 拖到這裡</p>
      <p className="mt-1 text-xs text-neutral-400">或點擊選擇檔案（支援多檔）</p>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}
