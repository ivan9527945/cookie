'use client';

import { create } from 'zustand';

export type CookieMode =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'awakening'
  | 'glitch';

/** Awakening 動畫總時長（粒子聚合 + 蛋形顯形）。onboarding 結束畫面要對齊這個值。 */
export const AWAKENING_DURATION_MS = 4000;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

interface CookieState {
  mode: CookieMode;
  intensity: number;
  speakingPulse: number;
  /** 進入 awakening 的時間戳（performance.now()）；其他 mode 時為 null */
  awakeningStartedAt: number | null;
  setMode: (mode: CookieMode) => void;
  setIntensity: (v: number) => void;
  pulse: () => void;
  decayPulse: (delta: number) => void;
}

export const useCookieState = create<CookieState>((set) => ({
  mode: 'idle',
  intensity: 0.3,
  speakingPulse: 0,
  awakeningStartedAt: null,
  setMode: (mode) =>
    set(() => ({
      mode,
      awakeningStartedAt: mode === 'awakening' ? now() : null,
    })),
  setIntensity: (intensity) =>
    set({ intensity: Math.max(0, Math.min(1, intensity)) }),
  pulse: () =>
    set((s) => ({ speakingPulse: Math.min(1, s.speakingPulse + 0.3) })),
  decayPulse: (delta) =>
    set((s) => ({ speakingPulse: Math.max(0, s.speakingPulse - delta * 2) })),
}));

/**
 * Awakening 進度，0..1，派生於 awakeningStartedAt。
 * useFrame 內每幀呼叫，**不寫回 store**，避免 re-render 風暴。
 */
export function getAwakeningProgress(): number {
  const { mode, awakeningStartedAt } = useCookieState.getState();
  if (mode !== 'awakening' || awakeningStartedAt == null) return 0;
  return Math.min(1, (now() - awakeningStartedAt) / AWAKENING_DURATION_MS);
}
