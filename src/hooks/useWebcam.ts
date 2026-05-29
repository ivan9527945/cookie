'use client';

import { create } from 'zustand';

// 視訊鏡頭的共享狀態。
// 放在中性的 hooks 層，讓「控制 UI（WebcamLayer）」與「3D 蛋形（Egg）」都能存取
// 同一個 <video> 元素——WebcamLayer 負責取得 stream 並播放，Egg 把它做成
// VideoTexture 餵進玻璃材質折射。避免 cookie-shell 反向依賴 chat 元件。

export type WebcamStatus = 'idle' | 'starting' | 'on' | 'denied' | 'error';

interface WebcamStore {
  status: WebcamStatus;
  /** 正在播放鏡頭畫面的 video 元素；null 表示尚未開啟。 */
  video: HTMLVideoElement | null;
  setStatus: (status: WebcamStatus) => void;
  setVideo: (video: HTMLVideoElement | null) => void;
}

export const useWebcam = create<WebcamStore>((set) => ({
  status: 'idle',
  video: null,
  setStatus: (status) => set({ status }),
  setVideo: (video) => set({ video }),
}));
