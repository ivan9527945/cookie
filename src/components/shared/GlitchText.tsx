'use client';

import { cn } from '@/lib/utils';

interface GlitchTextProps {
  children: React.ReactNode;
  className?: string;
  /** 強度 0..1 */
  intensity?: number;
}

export function GlitchText({
  children,
  className,
  intensity = 0.5,
}: GlitchTextProps) {
  return (
    <span
      className={cn('relative inline-block', className)}
      style={
        {
          '--glitch-intensity': intensity,
        } as React.CSSProperties
      }
      data-glitch
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 text-cyan-400 opacity-40 mix-blend-screen"
        style={{ transform: `translate(${intensity * 0.6}px, 0)` }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 text-pink-400 opacity-40 mix-blend-screen"
        style={{ transform: `translate(${-intensity * 0.6}px, 0)` }}
      >
        {children}
      </span>
    </span>
  );
}
