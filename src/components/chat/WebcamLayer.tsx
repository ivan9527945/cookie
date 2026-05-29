'use client';

// 視訊鏡頭層 ——「真實的我」的來源。
//
// 方向 B：鏡頭畫面主要不是平鋪在背景，而是被左側的玻璃蛋「折射」出來
// （由 Egg 讀取同一個 video 元素做成 VideoTexture）。這一層只負責：
//   1. 取得鏡頭 stream（由瀏覽器原生權限對話框把關，需使用者明確按下啟用）
//   2. 播放到一個 <video> 元素，並寫進 useWebcam store 供蛋折射
//   3. 在背景留一層極淡、模糊的你的殘影，保留「你在這個房間裡」的存在感
//   4. 尚未開啟時的授權提示

import { useCallback, useEffect, useRef } from 'react';
import { Video, VideoOff } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { cn } from '@/lib/utils';

export function WebcamLayer({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const status = useWebcam((s) => s.status);
  const setStatus = useWebcam((s) => s.setStatus);
  const setVideo = useWebcam((s) => s.setVideo);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setStatus('error');
      return;
    }
    setStatus('starting');
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
        setVideo(videoRef.current);
      }
      setStatus('on');
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setStatus(denied ? 'denied' : 'error');
    }
  }, [setStatus, setVideo]);

  // 卸載時停掉鏡頭、清掉 store。
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setVideo(null);
    };
  }, [setVideo]);

  const on = status === 'on';

  return (
    <div className={cn('overflow-hidden', className)}>
      {/* 背景殘影：同一個 video 元素，極淡＋重模糊＋去飽和，像你殘留在房間裡的氣息。
          它也同時被 Egg 當作折射來源。畫布透明，白底由 DreamBackground 負責。 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'h-full w-full scale-110 object-cover transition-opacity duration-[1500ms]',
          on ? 'opacity-[0.14]' : 'opacity-0'
        )}
        style={{ filter: 'blur(22px) saturate(0.7) brightness(1.05)' }}
      />

      {/* 尚未開啟鏡頭時的授權提示 */}
      {!on ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <button
            type="button"
            onClick={() => void start()}
            disabled={status === 'starting'}
            className="group flex flex-col items-center gap-3 text-neutral-500 transition hover:text-neutral-800 disabled:opacity-50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-300 bg-white/50 backdrop-blur-sm transition group-hover:border-neutral-500">
              {status === 'denied' || status === 'error' ? (
                <VideoOff className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </span>
            <span className="text-sm tracking-tight">
              {status === 'starting'
                ? '啟動鏡頭中…'
                : status === 'denied'
                  ? '鏡頭權限被拒，點此重試'
                  : status === 'error'
                    ? '找不到鏡頭，點此重試'
                    : '啟用鏡頭，把「你」交給它'}
            </span>
          </button>
          <p className="max-w-xs text-[11px] leading-relaxed tracking-wide text-neutral-400">
            鏡頭畫面只會留在這個瀏覽器分頁、即時折射進它的形體，不會上傳或儲存。
          </p>
        </div>
      ) : null}
    </div>
  );
}
