'use client';

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
  intensity: number;
  speakingPulse: number;
  setMode: (mode: CookieMode) => void;
  setIntensity: (v: number) => void;
  pulse: () => void;
  decayPulse: (delta: number) => void;
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
  decayPulse: (delta) =>
    set((s) => ({ speakingPulse: Math.max(0, s.speakingPulse - delta * 2) })),
}));
