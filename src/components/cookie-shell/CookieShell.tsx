'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { Scene } from './Scene';
import { PostFX } from './PostFX';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useDocumentVisible } from './hooks/useDocumentVisible';

interface CookieShellProps {
  /** 'hero' 用於 onboarding/landing，'ambient' 用於 chat 背景 */
  variant?: 'hero' | 'ambient';
  className?: string;
  /** 透明畫布：不繪製背景色與霧，讓底下的內容（例如視訊鏡頭）透出。 */
  transparent?: boolean;
  /** 蛋形偏轉（弧度），用來讓它「面向」某個方向，例如朝中央的視訊鏡頭。 */
  lean?: number;
  /** 讓蛋形以視訊鏡頭作為折射來源（方向 B：你被折射、含進蛋的形體裡）。 */
  webcamTransmission?: boolean;
}

export function CookieShell({
  variant = 'hero',
  className,
  transparent = false,
  lean = 0,
  webcamTransmission = false,
}: CookieShellProps) {
  const reducedMotion = useReducedMotion();
  const visible = useDocumentVisible();

  // Tab 隱藏時暫停 R3F frame loop；reduced motion 也走 demand-only。
  const frameloop = useMemo<'always' | 'demand' | 'never'>(() => {
    if (!visible) return 'never';
    if (reducedMotion) return 'demand';
    return 'always';
  }, [reducedMotion, visible]);

  const isMobile =
    typeof navigator !== 'undefined' && /Mobi/i.test(navigator.userAgent);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 35 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        frameloop={frameloop}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {transparent ? null : (
          <>
            <color attach="background" args={['#F4F4F0']} />
            <fog attach="fog" args={['#F4F4F0', 8, 14]} />
          </>
        )}
        <Suspense fallback={null}>
          <Scene
            variant={variant}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            lean={lean}
            webcamTransmission={webcamTransmission}
          />
          {/* 透明覆蓋模式不跑 PostFX：Vignette 會在透明邊緣壓出黑角，破壞透出效果 */}
          {reducedMotion || transparent ? null : <PostFX />}
        </Suspense>
      </Canvas>
    </div>
  );
}
