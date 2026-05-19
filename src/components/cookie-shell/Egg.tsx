'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useCookieState } from './hooks/useCookieState';

export function Egg() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { mode, intensity, speakingPulse, decayPulse } = useCookieState();

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // 呼吸 + 講話脈動
    const t = state.clock.elapsedTime;
    const breath = Math.sin(t * 0.8) * 0.5 + 0.5;
    const baseScale = 1 + breath * 0.015 * intensity + speakingPulse * 0.04;
    mesh.scale.set(baseScale, baseScale * 1.3, baseScale);

    if (mode === 'idle') {
      mesh.rotation.y += delta * 0.1;
    } else if (mode === 'thinking') {
      mesh.rotation.y += delta * 0.3;
    } else if (mode === 'listening') {
      mesh.rotation.y += delta * 0.05;
    }

    decayPulse(delta);
  });

  return (
    <mesh ref={meshRef} scale={[1, 1.3, 1]}>
      <sphereGeometry args={[1, 128, 128]} />
      <MeshTransmissionMaterial
        backside
        samples={6}
        thickness={0.4}
        chromaticAberration={0.05}
        anisotropy={0.3}
        distortion={0.3}
        distortionScale={0.5}
        temporalDistortion={0.1}
        ior={1.25}
        color="#FFFFFF"
        attenuationColor="#F0EEE6"
        attenuationDistance={2}
        roughness={0.05}
      />
    </mesh>
  );
}
