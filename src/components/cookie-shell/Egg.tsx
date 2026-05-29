'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { getAwakeningProgress, useCookieState } from './hooks/useCookieState';
import { useWebcam } from '@/hooks/useWebcam';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface EggProps {
  /** 方向 B：把視訊鏡頭做成 VideoTexture 餵進玻璃材質折射——「它是用你做的」。 */
  webcamTransmission?: boolean;
}

export function Egg({ webcamTransmission = false }: EggProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { mode, intensity, speakingPulse, decayPulse } = useCookieState();

  // 只在啟用時才訂閱鏡頭；其他頁面的蛋形完全不受影響。
  const video = useWebcam((s) => (webcamTransmission ? s.video : null));
  const videoTex = useMemo(() => {
    if (!video) return null;
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [video]);
  useEffect(() => () => videoTex?.dispose(), [videoTex]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Awakening: 粒子先聚合（0–0.5）→ 蛋形 0→1 出現（0.5–1.0）
    let awakeningScale = 1;
    if (mode === 'awakening') {
      const progress = getAwakeningProgress();
      awakeningScale = smoothstep(0.5, 1, progress);
    }

    const t = state.clock.elapsedTime;
    const breath = Math.sin(t * 0.8) * 0.5 + 0.5;
    const baseScale =
      awakeningScale * (1 + breath * 0.015 * intensity + speakingPulse * 0.04);
    mesh.scale.set(baseScale, baseScale * 1.3, baseScale);

    if (mode === 'idle') {
      mesh.rotation.y += delta * 0.1;
    } else if (mode === 'thinking') {
      mesh.rotation.y += delta * 0.3;
    } else if (mode === 'listening') {
      mesh.rotation.y += delta * 0.05;
    } else if (mode === 'awakening') {
      // 醒來時緩慢自轉，給聚合過程一個方向感
      mesh.rotation.y += delta * 0.15;
    }

    decayPulse(delta);
  });

  return (
    <mesh ref={meshRef} scale={[1, 1.3, 1]}>
      <sphereGeometry args={[1, 128, 128]} />
      <MeshTransmissionMaterial
        backside
        samples={6}
        transmission={1}
        // 有鏡頭時用它當折射來源（你被含進、扭曲在蛋裡）；沒有時走預設場景緩衝。
        buffer={videoTex ?? undefined}
        thickness={videoTex ? 0.7 : 0.4}
        chromaticAberration={videoTex ? 0.08 : 0.05}
        anisotropy={0.3}
        distortion={videoTex ? 0.45 : 0.3}
        distortionScale={0.5}
        temporalDistortion={0.1}
        ior={1.2}
        color="#FFFFFF"
        attenuationColor="#F0EEE6"
        attenuationDistance={videoTex ? 4 : 2}
        roughness={0.05}
      />
    </mesh>
  );
}
