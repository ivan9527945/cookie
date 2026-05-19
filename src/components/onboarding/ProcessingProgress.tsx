'use client';

import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number;
  className?: string;
}

export function ProcessingProgress({ label, value, className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
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
