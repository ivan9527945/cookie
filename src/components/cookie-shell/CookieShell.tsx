'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Scene } from './Scene';
import { PostFX } from './PostFX';

interface CookieShellProps {
  /** 'hero' 用於 onboarding/landing，'ambient' 用於 chat 背景 */
  variant?: 'hero' | 'ambient';
  className?: string;
}

export function CookieShell({
  variant = 'hero',
  className,
}: CookieShellProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 35 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#F4F4F0']} />
        <fog attach="fog" args={['#F4F4F0', 8, 14]} />
        <Suspense fallback={null}>
          <Scene variant={variant} />
          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  );
}
