'use client';

import { Float, Environment } from '@react-three/drei';
import { Egg } from './Egg';
import { ParticleField } from './ParticleField';

interface SceneProps {
  variant: 'hero' | 'ambient';
  reducedMotion?: boolean;
  isMobile?: boolean;
  /** 整顆蛋（含粒子）繞 Y 軸偏轉的弧度，用來讓它「面向」某方向。 */
  lean?: number;
  /** 讓蛋形以視訊鏡頭作為折射來源。 */
  webcamTransmission?: boolean;
}

export function Scene({
  variant,
  reducedMotion = false,
  isMobile = false,
  lean = 0,
  webcamTransmission = false,
}: SceneProps) {
  const particleCount = isMobile
    ? variant === 'hero'
      ? 500
      : 300
    : variant === 'hero'
      ? 1200
      : 600;

  const floatProps = reducedMotion
    ? { speed: 0, rotationIntensity: 0, floatIntensity: 0 }
    : {
        speed: 1.2,
        rotationIntensity: variant === 'hero' ? 0.4 : 0.15,
        floatIntensity: variant === 'hero' ? 0.6 : 0.3,
      };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={1.2}
        color="#FFFFFF"
        castShadow
      />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#E8E6E0" />

      <Environment preset="studio" environmentIntensity={0.6} />

      <group rotation={[0, lean, lean * 0.2]}>
        <Float {...floatProps}>
          <Egg webcamTransmission={webcamTransmission} />
          <ParticleField count={particleCount} />
        </Float>
      </group>
    </>
  );
}
