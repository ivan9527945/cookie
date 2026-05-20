'use client';

import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.35} darkness={0.32} />
    </EffectComposer>
  );
}
