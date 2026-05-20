'use client';

import { RoundedBox } from '@react-three/drei';

const METAL_FRAME = '#aab0b3';
const METAL_BRIGHT = '#c8cdce';
const METAL_DIM = '#8d9295';
const WHITE_SHEET = '#fdfdfb';
const PILLOW_WHITE = '#ffffff';
const WHEEL_DARK = '#383c3f';

export function Bed() {
  return (
    <group position={[0, 0, 0]}>
      {/* 床輪 x 4 */}
      <Wheel position={[-1.0, 0.09, 0.42]} />
      <Wheel position={[1.0, 0.09, 0.42]} />
      <Wheel position={[-1.0, 0.09, -0.42]} />
      <Wheel position={[1.0, 0.09, -0.42]} />

      {/* 輪子上方支柱（四根金屬桿連到床架） */}
      <FramePost position={[-1.0, 0.27, 0.42]} />
      <FramePost position={[1.0, 0.27, 0.42]} />
      <FramePost position={[-1.0, 0.27, -0.42]} />
      <FramePost position={[1.0, 0.27, -0.42]} />

      {/* 床架底部框（縱橫支撐桿） */}
      <RoundedBox
        args={[2.3, 0.06, 0.06]}
        radius={0.015}
        smoothness={2}
        position={[0, 0.42, 0.4]}
        castShadow
      >
        <meshStandardMaterial
          color={METAL_FRAME}
          roughness={0.35}
          metalness={0.75}
        />
      </RoundedBox>
      <RoundedBox
        args={[2.3, 0.06, 0.06]}
        radius={0.015}
        smoothness={2}
        position={[0, 0.42, -0.4]}
        castShadow
      >
        <meshStandardMaterial
          color={METAL_FRAME}
          roughness={0.35}
          metalness={0.75}
        />
      </RoundedBox>

      {/* 床身主箱（容納床墊） */}
      <RoundedBox
        args={[2.25, 0.18, 0.92]}
        radius={0.03}
        smoothness={3}
        position={[0, 0.55, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={METAL_BRIGHT}
          roughness={0.45}
          metalness={0.6}
        />
      </RoundedBox>

      {/* 床墊 */}
      <RoundedBox
        args={[2.18, 0.18, 0.86]}
        radius={0.05}
        smoothness={4}
        position={[0, 0.72, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={WHITE_SHEET}
          roughness={0.85}
          metalness={0}
        />
      </RoundedBox>

      {/* 床單覆蓋（薄薄一層在床墊上） */}
      <RoundedBox
        args={[2.2, 0.04, 0.88]}
        radius={0.04}
        smoothness={4}
        position={[0, 0.83, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.92}
          metalness={0}
        />
      </RoundedBox>

      {/* 枕頭 */}
      <RoundedBox
        args={[0.5, 0.11, 0.6]}
        radius={0.07}
        smoothness={4}
        position={[-0.78, 0.92, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={PILLOW_WHITE}
          roughness={0.95}
          metalness={0}
        />
      </RoundedBox>

      {/* 床頭板（從床墊後方升起） */}
      <RoundedBox
        args={[0.06, 0.95, 0.95]}
        radius={0.02}
        smoothness={3}
        position={[-1.16, 0.85, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#d4d8da"
          roughness={0.4}
          metalness={0.55}
        />
      </RoundedBox>
      {/* 床頭板頂端橫條 */}
      <RoundedBox
        args={[0.1, 0.06, 1.0]}
        radius={0.015}
        smoothness={2}
        position={[-1.16, 1.32, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={METAL_BRIGHT}
          roughness={0.3}
          metalness={0.8}
        />
      </RoundedBox>

      {/* 床尾板（較矮） */}
      <RoundedBox
        args={[0.06, 0.5, 0.95]}
        radius={0.02}
        smoothness={3}
        position={[1.16, 0.6, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#c4c8ca"
          roughness={0.4}
          metalness={0.6}
        />
      </RoundedBox>

      {/* 前側欄（半框型側欄，3/4 view 朝向相機那一側） */}
      <SideRail z={0.46} />

      {/* IV 點滴架 */}
      <IVPole position={[-1.55, 0, -0.35]} />

      {/* 側桌（左前角，承托花瓶） */}
      <SideTable position={[-2.0, 0, 1.4]} />
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
        <meshStandardMaterial color={WHEEL_DARK} roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.065, 16]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.35} metalness={0.85} />
      </mesh>
    </group>
  );
}

function FramePost({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
      <meshStandardMaterial color={METAL_DIM} roughness={0.35} metalness={0.8} />
    </mesh>
  );
}

function SideRail({ z }: { z: number }) {
  return (
    <group>
      {/* 上水平桿 */}
      <mesh position={[-0.05, 0.95, z]} castShadow>
        <boxGeometry args={[1.3, 0.035, 0.035]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* 中水平桿 */}
      <mesh position={[-0.05, 0.88, z]} castShadow>
        <boxGeometry args={[1.3, 0.025, 0.025]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* 兩側豎桿 */}
      <mesh position={[-0.7, 0.88, z]} castShadow>
        <boxGeometry args={[0.035, 0.18, 0.035]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0.6, 0.88, z]} castShadow>
        <boxGeometry args={[0.035, 0.18, 0.035]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

function IVPole({
  position,
}: {
  position: [number, number, number];
}) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* 底座（十字腳） */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.5, 0.025, 0.04]} />
        <meshStandardMaterial color={METAL_DIM} roughness={0.4} metalness={0.75} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.04, 0.025, 0.5]} />
        <meshStandardMaterial color={METAL_DIM} roughness={0.4} metalness={0.75} />
      </mesh>
      {/* 底座輪 */}
      {[
        [0.22, 0, 0],
        [-0.22, 0, 0],
        [0, 0, 0.22],
        [0, 0, -0.22],
      ].map(([dx, , dz], i) => (
        <mesh
          key={i}
          position={[dx, 0.015, dz as number]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.022, 0.022, 0.03, 12]} />
          <meshStandardMaterial color={WHEEL_DARK} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* 直立桿 */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 2.8, 16]} />
        <meshStandardMaterial color={METAL_BRIGHT} roughness={0.3} metalness={0.88} />
      </mesh>
      {/* 頂部 S 型掛勾 */}
      <mesh position={[0.06, 2.84, 0]} castShadow>
        <boxGeometry args={[0.14, 0.02, 0.02]} />
        <meshStandardMaterial color={METAL_DIM} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* IV 袋 */}
      <mesh position={[0.06, 2.55, 0]} castShadow>
        <boxGeometry args={[0.14, 0.36, 0.06]} />
        <meshStandardMaterial
          color="#fafcfb"
          roughness={0.15}
          metalness={0}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* 點滴管（很細的圓柱往床的方向） */}
      <mesh position={[0.45, 1.6, 0.18]} rotation={[0, 0, -Math.PI / 5]} castShadow>
        <cylinderGeometry args={[0.005, 0.005, 1.4, 8]} />
        <meshStandardMaterial color={METAL_DIM} roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function SideTable({
  position,
}: {
  position: [number, number, number];
}) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* 桌面 */}
      <RoundedBox
        args={[0.5, 0.04, 0.5]}
        radius={0.02}
        smoothness={2}
        position={[0, 0.75, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#e8ebec" roughness={0.55} metalness={0.2} />
      </RoundedBox>
      {/* 桌腳 */}
      {[
        [-0.2, 0, 0.2],
        [0.2, 0, 0.2],
        [-0.2, 0, -0.2],
        [0.2, 0, -0.2],
      ].map(([dx, , dz], i) => (
        <mesh
          key={i}
          position={[dx, 0.37, dz as number]}
          castShadow
        >
          <cylinderGeometry args={[0.015, 0.015, 0.75, 10]} />
          <meshStandardMaterial color={METAL_DIM} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
      {/* 花瓶 + 花 */}
      <Vase position={[0, 0.77, 0]} />
    </group>
  );
}

function Vase({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* 花瓶身 */}
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 20]} />
        <meshStandardMaterial
          color="#e8ecee"
          roughness={0.1}
          metalness={0}
          transparent
          opacity={0.5}
        />
      </mesh>
      {/* 花莖（幾根綠色細桿） */}
      {[
        [-0.02, 0],
        [0.01, 0.02],
        [0.02, -0.01],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.28, dz]} castShadow>
          <cylinderGeometry args={[0.004, 0.004, 0.2, 6]} />
          <meshStandardMaterial color="#6b8470" roughness={0.6} />
        </mesh>
      ))}
      {/* 花苞（小球，淡紫粉） */}
      <mesh position={[-0.02, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.025, 12, 8]} />
        <meshStandardMaterial color="#d6c5d4" roughness={0.7} />
      </mesh>
      <mesh position={[0.01, 0.4, 0.02]} castShadow>
        <sphereGeometry args={[0.022, 12, 8]} />
        <meshStandardMaterial color="#e5d4d8" roughness={0.7} />
      </mesh>
      <mesh position={[0.02, 0.37, -0.01]} castShadow>
        <sphereGeometry args={[0.024, 12, 8]} />
        <meshStandardMaterial color="#c8b8c5" roughness={0.7} />
      </mesh>
    </group>
  );
}
