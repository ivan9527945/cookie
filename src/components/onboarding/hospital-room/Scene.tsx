'use client';

import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Bed } from './Bed';

interface Props {
  reducedMotion?: boolean;
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.85, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export function Scene({ reducedMotion = false }: Props) {
  useEffect(() => {
    RectAreaLightUniformsLib.init();
  }, []);

  return (
    <>
      <CameraSetup />
      <ambientLight intensity={0.7} color="#ffffff" />

      {/* 天花板矩形面光源 — 兩塊 LED 燈面（提供光照） */}
      <rectAreaLight
        intensity={6.0}
        width={2.8}
        height={1.3}
        position={[-1.9, 3.9, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#ffffff"
      />
      <rectAreaLight
        intensity={6.0}
        width={2.8}
        height={1.3}
        position={[1.9, 3.9, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#ffffff"
      />

      {/* 視覺上可見的燈面（emissive + bloom） */}
      <mesh position={[-1.9, 3.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[1.9, 3.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {/* 側窗光 — 模擬從右側窗戶進來的柔和光 */}
      <directionalLight
        position={[5, 4, 3]}
        intensity={0.55}
        color="#ffffff"
        castShadow={!reducedMotion}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      <Environment preset="studio" environmentIntensity={0.65} />

      {/* 地板 */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#dadddd"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* 地板網格線（淡淡的方塊紋） */}
      <gridHelper
        args={[16, 16, '#b6bcbd', '#c8cdcd']}
        position={[0, 0.005, 0]}
      />

      {/* 後牆 */}
      <mesh position={[0, 3, -5.5]} receiveShadow>
        <planeGeometry args={[22, 8]} />
        <meshStandardMaterial color="#eef0ee" roughness={0.95} />
      </mesh>

      {/* 左側牆 */}
      <mesh
        position={[-7.5, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#f4f5f3" roughness={0.95} />
      </mesh>

      {/* 天花板（讓燈面有著床基底） */}
      <mesh position={[0, 4.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial color="#e8eae9" roughness={0.95} />
      </mesh>

      <Bed />
    </>
  );
}
