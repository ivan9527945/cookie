'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { Scene } from './Scene';
import { PostFX } from './PostFX';
import { useReducedMotion } from '@/components/cookie-shell/hooks/useReducedMotion';
import { useDocumentVisible } from '@/components/cookie-shell/hooks/useDocumentVisible';

export function Room() {
  const reducedMotion = useReducedMotion();
  const visible = useDocumentVisible();

  const frameloop = useMemo<'always' | 'demand' | 'never'>(() => {
    if (!visible) return 'never';
    if (reducedMotion) return 'demand';
    return 'always';
  }, [reducedMotion, visible]);

  const isMobile =
    typeof navigator !== 'undefined' && /Mobi/i.test(navigator.userAgent);

  return (
    <Canvas
      camera={{ position: [2.6, 1.6, 3.4], fov: 38 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      frameloop={frameloop}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      shadows
    >
      <color attach="background" args={['#f4f5f3']} />
      <fog attach="fog" args={['#f4f5f3', 9, 26]} />
      <Suspense fallback={null}>
        <Scene reducedMotion={reducedMotion} />
        {reducedMotion ? null : <PostFX />}
      </Suspense>
    </Canvas>
  );
}
