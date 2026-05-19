import { cn } from '@/lib/utils';

export function ScanLines({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-10',
        'bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.04)_3px)]',
        className
      )}
    />
  );
}
