'use client';

// 背景：光之虛空（加強版）。
// 一間無限延伸的白色攝影棚，上方灑下兩道交叉的體積光束、空氣裡漂著被光打亮的塵粒，
// 地平線把空間往深處拉，四周以較重的電影感暗角收束。光束強度隨對話狀態呼吸。
// 蛋與蛋裡折射的你是主角，這層負責把氛圍撐得更強烈、更超現實。

import { motion, useReducedMotion } from 'framer-motion';
import { useCookieState } from '@/components/cookie-shell/hooks/useCookieState';
import { cn } from '@/lib/utils';

// 漂浮塵粒（百分比座標），集中在光束帶上、被打亮。
const MOTES = [
  { left: '16%', top: '28%', size: 4, dur: 12, drift: -46, delay: 0 },
  { left: '22%', top: '58%', size: 5, dur: 15, drift: -58, delay: 2.5 },
  { left: '30%', top: '40%', size: 3, dur: 13, drift: -50, delay: 1.2 },
  { left: '36%', top: '70%', size: 6, dur: 16, drift: -64, delay: 4 },
  { left: '44%', top: '34%', size: 4, dur: 14, drift: -52, delay: 3 },
  { left: '50%', top: '60%', size: 3, dur: 17, drift: -66, delay: 1.8 },
  { left: '26%', top: '20%', size: 5, dur: 18, drift: -70, delay: 6 },
  { left: '40%', top: '80%', size: 4, dur: 15, drift: -60, delay: 3.6 },
  { left: '12%', top: '46%', size: 3, dur: 14, drift: -48, delay: 5 },
  { left: '54%', top: '46%', size: 5, dur: 16, drift: -62, delay: 7 },
  { left: '33%', top: '54%', size: 4, dur: 13, drift: -54, delay: 2.2 },
  { left: '47%', top: '24%', size: 3, dur: 19, drift: -72, delay: 8 },
];

export function DreamBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const mode = useCookieState((s) => s.mode);
  const active = mode === 'thinking' || mode === 'speaking';

  const beamOpacity = reduce
    ? 0.8
    : active
      ? [0.85, 1, 0.85]
      : [0.62, 0.82, 0.62];

  return (
    <div className={cn('overflow-hidden', className)}>
      {/* 底：無限白攝影棚，帶明顯的上亮下暗，撐出空間與對比 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #fbfcfa 0%, #eef0ec 46%, #d9dcd8 82%, #cdd0cc 100%)',
        }}
      />
      {/* 地平線：遠處微微發亮的一道，把房間往深處拉 */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-[62%] h-[1px]"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
          opacity: 0.5,
        }}
      />

      {/* 光源：上方偏左的強烈亮斑（光束源頭） */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 46% 34% at 34% 2%, rgba(255,255,255,1), rgba(255,255,255,0) 58%)',
        }}
      />

      {/* 主體積光束：從上方斜射向蛋形所在的左側，邊緣較明確、帶輝光 */}
      <motion.div
        aria-hidden
        className="absolute -top-[18%] left-[2%] h-[150%] w-[34%] origin-top blur-xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(222,236,246,0.5) 38%, rgba(255,255,255,0) 70%)',
          transform: 'rotate(13deg)',
          mixBlendMode: 'screen',
        }}
        animate={{ opacity: beamOpacity }}
        transition={
          reduce
            ? undefined
            : { duration: active ? 4 : 7, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      {/* 第二道較窄、較淡的交叉光束 */}
      <motion.div
        aria-hidden
        className="absolute -top-[18%] left-[24%] h-[150%] w-[16%] origin-top blur-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(214,228,240,0.28) 44%, rgba(255,255,255,0) 72%)',
          transform: 'rotate(-7deg)',
          mixBlendMode: 'screen',
        }}
        animate={{ opacity: reduce ? 0.5 : active ? [0.4, 0.7, 0.4] : [0.3, 0.5, 0.3] }}
        transition={
          reduce
            ? undefined
            : { duration: active ? 5 : 9, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* 漂浮塵粒（被光打亮） */}
      {reduce
        ? null
        : MOTES.map((m, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: m.left,
                top: m.top,
                width: m.size,
                height: m.size,
                boxShadow: '0 0 6px 1px rgba(255,255,255,0.8)',
              }}
              animate={{ y: [0, m.drift], opacity: [0, 0.85, 0] }}
              transition={{
                duration: m.dur,
                delay: m.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

      {/* 電影感暗角：四周明顯壓暗，把視線收向中央，強化超現實聚焦 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 68% 66% at 48% 44%, rgba(34,42,56,0) 48%, rgba(28,36,50,0.5) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}
