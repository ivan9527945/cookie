import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function SystemMessage({ children, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-500',
        className
      )}
    >
      {children}
    </div>
  );
}
