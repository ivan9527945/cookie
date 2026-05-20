import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={cn(
        'inline-block h-3 w-3 animate-spin rounded-full border border-current border-r-transparent align-[-1px]',
        className
      )}
    />
  );
}
