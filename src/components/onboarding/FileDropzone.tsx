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
        'group relative block h-full w-full cursor-pointer transition-all duration-300',
        className
      )}
      style={{
        // drag-over 時冒出一團柔光蓋住床面（hint：這就是 drop 區）
        background: active
          ? 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0) 75%)'
          : 'transparent',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      <div
        className={cn(
          'pointer-events-none flex h-full w-full flex-col items-center justify-center transition-all duration-300',
          active ? 'scale-[1.02]' : 'scale-100'
        )}
      >
        <p
          className={cn(
            'text-sm tracking-tight transition-colors duration-300',
            active ? 'text-neutral-900' : 'text-neutral-600 group-hover:text-neutral-800'
          )}
          style={{
            textShadow: '0 1px 2px rgba(255,255,255,0.6)',
          }}
        >
          把 LINE 匯出的 .txt 拖到這裡
        </p>
        <p
          className="mt-1 text-[11px] uppercase tracking-[0.24em] text-neutral-500/80"
          style={{
            textShadow: '0 1px 2px rgba(255,255,255,0.5)',
          }}
        >
          specimen intake · drop or click
        </p>
      </div>
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
