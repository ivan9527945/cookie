# Cookie Shell — WebGL 實作

本文件規範 Cookie 主視覺元件的實作細節：一顆漂浮在白色虛空中的半透明蛋形物件，內部有粒子流動，會隨對話狀態呼吸、漣漪、glitch。

## 一、視覺參考與設計目標

**參考**：黑鏡《White Christmas》中的 Cookie 裝置——白色蛋形、極簡、有冷光感、看起來「乾淨到讓人不安」。

**核心視覺意象**：

```
       ╭───────╮
      ╱         ╲
     │   • • •   │     ← 內部粒子 (思緒)
     │  • · · •  │
     │   • • •   │
      ╲         ╱
       ╰───────╯
       
   (漂浮、緩慢呼吸、表面有 fresnel 反光)
```

**狀態機**（決定當下表現）：

| 狀態 | 視覺表現 | 觸發 |
|------|----------|------|
| `idle` | 緩慢自轉，輕微呼吸 | 預設 |
| `listening` | 內部粒子加速、漣漪外擴 | 使用者輸入中 |
| `thinking` | 表面細微 glitch，粒子聚成漩渦 | LLM 生成中 |
| `speaking` | 隨字符節奏脈動 | 訊息 streaming |
| `awakening` | 從粒子聚合成形 | Onboarding 完成的那一刻 |
| `glitch` | 強烈 chromatic aberration + scan line | 系統訊息、警示 |

---

## 二、技術選型

| 元件 | 選型 | 用途 |
|------|------|------|
| React 渲染器 | `@react-three/fiber` v9 | R3F 主體 |
| Helpers | `@react-three/drei` | `<Float>`, `<Environment>`, `<MeshTransmissionMaterial>` |
| Post-FX | `@react-three/postprocessing` | Bloom、Chromatic Aberration、Glitch |
| 動畫 | Three.js 內建 + 自寫 shader | 不引入 GSAP，靠 `useFrame` |
| 狀態 | Zustand（輕量、不重渲）| Cookie 狀態跨元件共享 |

---

## 三、檔案結構

```
src/components/cookie-shell/
├── CookieShell.tsx          # 對外入口（含 Canvas）
├── Scene.tsx                # 場景設定：燈光、環境
├── Egg.tsx                  # 蛋形主體
├── ParticleField.tsx        # 內部粒子系統
├── PostFX.tsx               # 後製效果鏈
├── shaders/
│   ├── egg.vert.ts          # vertex shader (呼吸 displacement)
│   ├── egg.frag.ts          # fragment shader (fresnel + glitch)
│   └── particles.ts         # 粒子 shader
├── hooks/
│   ├── useCookieState.ts    # Zustand store
│   └── useBreathing.ts      # 呼吸節奏 hook
└── index.ts
```

---

## 四、狀態管理（Zustand）

`hooks/useCookieState.ts`

```typescript
import { create } from 'zustand';

export type CookieMode =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'awakening'
  | 'glitch';

interface CookieState {
  mode: CookieMode;
  intensity: number;        // 0..1, 用來連續控制動效強度
  speakingPulse: number;    // 0..1, streaming 時隨字元跳動
  setMode: (mode: CookieMode) => void;
  setIntensity: (v: number) => void;
  pulse: () => void;        // 每個 token 來時呼叫
}

export const useCookieState = create<CookieState>((set) => ({
  mode: 'idle',
  intensity: 0.3,
  speakingPulse: 0,
  setMode: (mode) => set({ mode }),
  setIntensity: (intensity) =>
    set({ intensity: Math.max(0, Math.min(1, intensity)) }),
  pulse: () =>
    set((s) => ({ speakingPulse: Math.min(1, s.speakingPulse + 0.3) })),
}));
```

對話 streaming 時，每收到一個 token 就呼叫 `pulse()`，配合 `useFrame` 衰減：

```typescript
useFrame((_, delta) => {
  const decay = delta * 2;
  useCookieState.setState((s) => ({
    speakingPulse: Math.max(0, s.speakingPulse - decay),
  }));
});
```

---

## 五、對外元件 `CookieShell.tsx`

```tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Scene } from './Scene';
import { PostFX } from './PostFX';

interface CookieShellProps {
  /** 'hero' 用於 onboarding/landing，'ambient' 用於 chat 背景 */
  variant?: 'hero' | 'ambient';
  className?: string;
}

export function CookieShell({ variant = 'hero', className }: CookieShellProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 35 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#F4F4F0']} />
        <fog attach="fog" args={['#F4F4F0', 8, 14]} />
        <Suspense fallback={null}>
          <Scene variant={variant} />
          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

**使用方式**

```tsx
import dynamic from 'next/dynamic';

const CookieShell = dynamic(
  () => import('@/components/cookie-shell').then((m) => m.CookieShell),
  { ssr: false }
);

// page.tsx
<CookieShell variant="hero" className="h-screen w-screen" />
```

---

## 六、場景 `Scene.tsx`

```tsx
import { Float, Environment } from '@react-three/drei';
import { Egg } from './Egg';
import { ParticleField } from './ParticleField';

export function Scene({ variant }: { variant: 'hero' | 'ambient' }) {
  return (
    <>
      {/* 環境光 + 主光（從上方來，模擬手術室白光感） */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={1.2}
        color="#FFFFFF"
        castShadow
      />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#E8E6E0" />

      {/* drei Environment 提供 HDRI 反射，讓玻璃材質有層次 */}
      <Environment preset="studio" environmentIntensity={0.6} />

      {/* Float 給整體一個飄浮感 */}
      <Float
        speed={1.2}
        rotationIntensity={variant === 'hero' ? 0.4 : 0.15}
        floatIntensity={variant === 'hero' ? 0.6 : 0.3}
      >
        <Egg />
        <ParticleField />
      </Float>
    </>
  );
}
```

---

## 七、蛋形主體 `Egg.tsx`

蛋形 = 拉長的球體（沿 Y 軸縮放）+ 在 vertex shader 中加入低頻 noise 做呼吸。

```tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useCookieState } from './hooks/useCookieState';
import { eggVertexShader, eggFragmentShader } from './shaders/egg';

export function Egg() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<any>(null!);
  const { mode, intensity, speakingPulse } = useCookieState();

  // 自訂 uniforms 給 shader 用
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
      uGlitch: { value: 0 },
      uPulse: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uIntensity.value = THREE.MathUtils.lerp(
      uniforms.uIntensity.value,
      intensity,
      delta * 2
    );
    uniforms.uPulse.value = speakingPulse;
    uniforms.uGlitch.value = mode === 'glitch' ? 1 : mode === 'thinking' ? 0.3 : 0;

    // idle 緩慢自轉
    if (mode === 'idle' && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1, 1.3, 1]}>
      {/* 高細分度球體做為蛋形基底，shader 會做 displacement */}
      <sphereGeometry args={[1, 128, 128]} />
      
      {/* 玻璃感主材質 */}
      <MeshTransmissionMaterial
        ref={matRef}
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
```

> **進階版本**：若想完全自訂表面 displacement 與 fresnel 漸層，可改用 `<shaderMaterial>` 配合下方 shader 程式碼。`MeshTransmissionMaterial` 是 drei 提供的開箱方案，視覺效果好但較難動態變形。建議：第一版用 `MeshTransmissionMaterial`，後續迭代時再切換成完全自訂 shader。

---

## 八、自訂 Shader

`shaders/egg.ts`

```typescript
export const eggVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simplex noise (簡化版, 實作可從 https://github.com/ashima/webgl-noise 取得)
  // ... noise function declaration ...

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // 呼吸 displacement: 低頻 noise * intensity
    float breath = sin(uTime * 0.8) * 0.5 + 0.5;
    float noise = snoise(position * 2.0 + uTime * 0.3) * 0.05;
    float displacement = breath * 0.02 * uIntensity + noise * uIntensity;
    displacement += uPulse * 0.04; // 講話時的脈動

    vDisplacement = displacement;
    vec3 displaced = position + normal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const eggFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Fresnel：邊緣亮，正面透
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

    // 基底色：骨白
    vec3 base = vec3(0.96, 0.95, 0.92);

    // glitch 時加入 RGB 偏移
    float glitchOffset = uGlitch * 0.1 * sin(uTime * 60.0 + vPosition.y * 30.0);
    vec3 color = base + vec3(glitchOffset, 0.0, -glitchOffset);

    // 加入 fresnel 高光
    color = mix(color, vec3(1.0), fresnel * 0.4);

    gl_FragColor = vec4(color, 0.85 + fresnel * 0.15);
  }
`;
```

> Simplex noise 函式有點長，建議使用 [`webgl-noise`](https://github.com/ashima/webgl-noise) 或 npm 套件 `glsl-noise` 引入。

---

## 九、粒子系統 `ParticleField.tsx`

蛋的內部有大約 800–2000 顆粒子，代表「思緒」。粒子在蛋形體積內隨機分布，並以低頻 noise 流動。

```tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCookieState } from './hooks/useCookieState';

const PARTICLE_COUNT = 1200;

export function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);
  const { mode, intensity } = useCookieState();

  // 初始化粒子位置（在蛋形體積內均勻分布）
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 用 rejection sampling 確保在蛋形內
      let x, y, z;
      do {
        x = (Math.random() - 0.5) * 2;
        y = (Math.random() - 0.5) * 2.6;
        z = (Math.random() - 0.5) * 2;
      } while (
        (x * x) / 0.85 + (y * y) / 1.4 + (z * z) / 0.85 > 1
      );
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, []);

  // 初始速度
  const velocities = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.001;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const speed =
      mode === 'thinking' ? 3 : mode === 'listening' ? 1.8 : 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      // 加速度受 mode 影響
      posAttr.array[ix] += velocities[ix] * speed;
      posAttr.array[ix + 1] += velocities[ix + 1] * speed;
      posAttr.array[ix + 2] += velocities[ix + 2] * speed;

      // 邊界檢查：若飄出蛋形就拉回中心
      const x = posAttr.array[ix];
      const y = posAttr.array[ix + 1];
      const z = posAttr.array[ix + 2];
      if ((x * x) / 0.85 + (y * y) / 1.4 + (z * z) / 0.85 > 1) {
        // 反向移動
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
          count={PARTICLE_COUNT}
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
```

> **效能注意**：1200 顆粒子在 60fps 下每幀 CPU 計算 3600 個浮點數運算，桌機沒問題，行動裝置可降至 600 顆。若想完全 GPU 化，改寫成 instanced mesh + GPGPU。

---

## 十、後製效果 `PostFX.tsx`

```tsx
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useCookieState } from './hooks/useCookieState';
import { Vector2 } from 'three';

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
```

---

## 十一、與對話流程整合

在 `useChat.ts` 中根據 streaming 狀態驅動 Cookie 的狀態機：

```typescript
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';

export function useChat() {
  const setMode = useCookieState((s) => s.setMode);
  const pulse = useCookieState((s) => s.pulse);

  async function send(text: string) {
    setMode('thinking');
    const res = await fetch('/api/chat', { method: 'POST', body: text });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    setMode('speaking');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      pulse();              // ← 每個 chunk 都讓 Cookie 脈動
      // 處理 token...
    }
    setMode('idle');
  }

  return { send };
}
```

當使用者開始打字（`onChange`），呼叫 `setMode('listening')`。

---

## 十二、Awakening 動畫（onboarding 結束時的關鍵畫面）

這是整個專案的高光時刻：使用者完成 LINE 匯入、persona 生成完成的瞬間，鏡頭推進、粒子聚合成蛋形、Cookie 第一次「醒來」說「我是誰？」

實作思路：

1. 初始狀態：粒子散布在整個畫面（高斯分布、範圍大），蛋形 mesh `visible={false}`
2. 進度條到 100% 時，觸發 `setMode('awakening')`
3. `awakening` 模式下，用 `useFrame` 將粒子位置線性插值（lerp）至蛋形體積內，同時粒子尺寸縮小、亮度提高
4. 收斂完成後，蛋形 mesh 從 `scale={0}` 漸入到 `scale={1}`，配合 Bloom 強度從 1.5 衰減到 0.4
5. 進入 `idle` 狀態，Cookie 出聲

對應 timing 大約 4–6 秒，搭配音效（低頻嗡鳴漸入 + 一個 click），會非常有戲。

---

## 十三、行動裝置降級策略

`useThree` 偵測裝置能力，動態調整：

```typescript
const dpr = useThree((s) => s.viewport.dpr);
const isMobile = /Mobi/i.test(navigator.userAgent);

// 在 Scene 或 ParticleField 中根據條件降階
const particleCount = isMobile ? 500 : 1200;
const enablePostFX = !isMobile || dpr <= 2;
const transmissionSamples = isMobile ? 3 : 6;
```

也可以提供「performance mode」設定讓使用者手動切換。

---

## 十四、效能基準（目標）

| 裝置 | 目標 FPS | DPR | 粒子數 | PostFX |
|------|---------|-----|--------|--------|
| Desktop (M2 Mac / 整合顯卡) | 60 | 2 | 1200 | 全開 |
| Desktop (獨顯) | 60 | 2 | 2000 | 全開 + samples 12 |
| iPhone 14+ | 60 | 2 | 800 | Bloom + 弱 ChromaticAberration |
| Android 中階 | 30–60 | 1.5 | 500 | 僅 Bloom |
| 低階裝置 | 提供 fallback：CSS-only 蛋形 + 漸層動畫 | | | |

---

## 十五、Checklist（實作完成標準）

- [ ] `idle` 狀態流暢呼吸，60fps 穩定
- [ ] 對話 streaming 時 `speaking` pulse 與字符節奏視覺同步
- [ ] `thinking` 狀態的 glitch 不影響閱讀（不要太強）
- [ ] Awakening 動畫流暢、有戲劇感，至少 4 秒
- [ ] 行動裝置自動降級不會破版
- [ ] 從 chat 頁離開時 Canvas 正確 unmount，無 memory leak
- [ ] Tab 切到背景時暫停 `useFrame`（用 `frameloop="demand"` 或自管）
- [ ] 提供 `prefers-reduced-motion` 的 fallback（減弱所有動效）
