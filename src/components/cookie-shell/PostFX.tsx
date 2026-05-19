'use client';

import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useCookieState } from './hooks/useCookieState';

export function PostFX() {
  const mode = useCookieState((s) => s.mode);
  const glitching = mode === 'glitch';
  const thinking = mode === 'thinking';

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <ChromaticAberration
        offset={
          new Vector2(
            glitching ? 0.004 : thinking ? 0.0015 : 0.0008,
            glitching ? 0.004 : thinking ? 0.0015 : 0.0008
          )
        }
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise
        opacity={glitching ? 0.15 : 0.03}
        blendFunction={BlendFunction.OVERLAY}
      />
      <Vignette eskil={false} offset={0.3} darkness={0.4} />
    </EffectComposer>
  );
}
