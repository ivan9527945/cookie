'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: ReactNode;
  spinnerPosition?: 'leading' | 'trailing';
}

/**
 * 中性版 Button：完全沿用呼叫端 className，只負責加 loading 行為。
 *   - loading=true → disabled + spinner（取代或附加在文字旁）
 *   - 即使呼叫端忘了把 onClick 包成 async-guard，disabled 也擋掉重複觸發
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    loading = false,
    loadingText,
    spinnerPosition = 'leading',
    disabled,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const content = loading && loadingText !== undefined ? loadingText : children;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-1.5',
        className
      )}
      {...rest}
    >
      {loading && spinnerPosition === 'leading' ? <Spinner /> : null}
      {content}
      {loading && spinnerPosition === 'trailing' ? <Spinner /> : null}
    </button>
  );
});
