'use client';

// 視訊鏡頭背景層 ——「真實的我」。
// 對應參考畫面最遠那層（藍衣男子）：打開電腦前鏡頭，把鏡頭畫面鋪滿整個背景，
// 像 Black Mirror 那面巨大的視訊牆。鏡頭存取由瀏覽器原生權限對話框把關，
// 需要使用者按下「啟用鏡頭」這個明確動作後才會開啟。

import { useCallback, useEffect, useRef, useState } from 'react';
import { Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type CamState = 'idle' | 'starting' | 'on' | 'denied' | 'error';

export function WebcamLayer({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>('idle');

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setState('error');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState('on');
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setState(denied ? 'denied' : 'error');
    }
  }, []);

  // 卸載時停掉鏡頭，釋放裝置。
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className={cn('overflow-hidden bg-[#f4f4f0]', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'h-full w-full object-cover transition-opacity duration-[1200ms]',
          state === 'on' ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          // 讓鏡頭畫面帶點「螢幕」的質感，貼近參考畫面的視訊牆。
          filter: 'contrast(1.06) brightness(1.04) saturate(0.92)',
        }}
      />

      {/* === 螢幕質感疊層（像素網點 / 掃描線 / 暈影 / 冷色調） === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          mixBlendMode: 'overlay',
          opacity: 0.5,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 2px, transparent 3px)',
          opacity: 0.4,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 45%, rgba(60,72,90,0) 55%, rgba(40,50,66,0.32) 100%)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* === 尚未開啟鏡頭時的提示 === */}
      {state !== 'on' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <button
            type="button"
            onClick={() => void start()}
            disabled={state === 'starting'}
            className="group flex flex-col items-center gap-3 text-neutral-500 transition hover:text-neutral-800 disabled:opacity-50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-300 bg-white/50 backdrop-blur-sm transition group-hover:border-neutral-500">
              {state === 'denied' || state === 'error' ? (
                <VideoOff className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </span>
            <span className="text-sm tracking-tight">
              {state === 'starting'
                ? '啟動鏡頭中…'
                : state === 'denied'
                  ? '鏡頭權限被拒，點此重試'
                  : state === 'error'
                    ? '找不到鏡頭，點此重試'
                    : '啟用鏡頭，讓「你」出現在這一層'}
            </span>
          </button>
          <p className="max-w-xs text-[11px] leading-relaxed tracking-wide text-neutral-400">
            鏡頭畫面只會留在這個瀏覽器分頁，不會上傳或儲存。
          </p>
        </div>
      ) : null}
    </div>
  );
}
