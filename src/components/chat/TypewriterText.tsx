'use client';

import { useTypewriter } from '@/hooks/useTypewriter';

export function TypewriterText({
  text,
  speedMs = 18,
}: {
  text: string;
  speedMs?: number;
}) {
  const shown = useTypewriter(text, speedMs);
  return <span>{shown}</span>;
}
