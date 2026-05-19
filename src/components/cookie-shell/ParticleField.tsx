'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAwakeningProgress, useCookieState } from './hooks/useCookieState';

const PARTICLE_COUNT = 1200;
const A2 = 0.85; // 蛋形 x/z 半軸平方參考
const B2 = 1.4; // y 半軸

function insideEgg(x: number, y: number, z: number) {
  return (x * x) / A2 + (y * y) / B2 + (z * z) / A2 <= 1;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function ParticleField({ count = PARTICLE_COUNT }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { mode, intensity } = useCookieState();
  const lastModeRef = useRef(mode);

  // targetPositions = 在蛋形體積內的最終位置
  // outerPositions  = awakening 起點：散落在 2.5–4 的球殼上
  // velocities      = idle / listening / thinking 時的漂浮速度
  const { targetPositions, outerPositions, velocities } = useMemo(() => {
    const targetPositions = new Float32Array(count * 3);
    const outerPositions = new Float32Array(count * 3);
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
      targetPositions[i * 3] = x;
      targetPositions[i * 3 + 1] = y;
      targetPositions[i * 3 + 2] = z;

      // 散開位置：球面隨機 + 半徑 2.5–4
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(Math.random() * 2 - 1);
      const r = 2.5 + Math.random() * 1.5;
      outerPositions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      outerPositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      outerPositions[i * 3 + 2] = r * Math.cos(theta);

      velocities[i * 3] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }
    return { targetPositions, outerPositions, velocities };
  }, [count]);

  // 初始 buffer 直接用 target（適用於 chat / persona 等預設 idle 的頁面）
  const initialPositions = useMemo(
    () => new Float32Array(targetPositions),
    [targetPositions]
  );

  // 切入 awakening 時，把 attribute 重置到 outer（強制看見「散開→聚合」過程）
  useEffect(() => {
    const prev = lastModeRef.current;
    lastModeRef.current = mode;
    if (mode === 'awakening' && prev !== 'awakening' && pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      arr.set(outerPositions);
      posAttr.needsUpdate = true;
    }
  }, [mode, outerPositions]);

  useFrame(() => {
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    if (mode === 'awakening') {
      const t = easeInOutCubic(getAwakeningProgress());
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        arr[ix] =
          outerPositions[ix] + (targetPositions[ix] - outerPositions[ix]) * t;
        arr[ix + 1] =
          outerPositions[ix + 1] +
          (targetPositions[ix + 1] - outerPositions[ix + 1]) * t;
        arr[ix + 2] =
          outerPositions[ix + 2] +
          (targetPositions[ix + 2] - outerPositions[ix + 2]) * t;
      }
      posAttr.needsUpdate = true;
      return;
    }

    const speed =
      mode === 'thinking'
        ? 3
        : mode === 'listening'
          ? 1.8
          : mode === 'speaking'
            ? 2.2
            : 0.6;

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
          args={[initialPositions, 3]}
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
