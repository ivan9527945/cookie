'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCookieState } from './hooks/useCookieState';

const PARTICLE_COUNT = 1200;
const A2 = 0.85; // 蛋形 x/z 半軸平方參考
const B2 = 1.4; // y 半軸

function insideEgg(x: number, y: number, z: number) {
  return (x * x) / A2 + (y * y) / B2 + (z * z) / A2 <= 1;
}

export function ParticleField({ count = PARTICLE_COUNT }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { mode, intensity } = useCookieState();

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let z = 0;
      do {
        x = (Math.random() - 0.5) * 2;
        y = (Math.random() - 0.5) * 2.6;
        z = (Math.random() - 0.5) * 2;
      } while (!insideEgg(x, y, z));
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities[i * 3] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }
    return { positions, velocities };
  }, [count]);

  useFrame(() => {
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const speed =
      mode === 'thinking' ? 3 : mode === 'listening' ? 1.8 : mode === 'speaking' ? 2.2 : 0.6;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] += velocities[ix] * speed;
      arr[ix + 1] += velocities[ix + 1] * speed;
      arr[ix + 2] += velocities[ix + 2] * speed;

      if (!insideEgg(arr[ix], arr[ix + 1], arr[ix + 2])) {
        velocities[ix] *= -1;
        velocities[ix + 1] *= -1;
        velocities[ix + 2] *= -1;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color="#666666"
        transparent
        opacity={0.6 * intensity + 0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
