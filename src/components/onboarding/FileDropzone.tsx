'use client';

import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  className?: string;
}

// 漂浮光塵的相對座標（百分比），讓塵粒散落在光毯四周。
const MOTES = [
  { left: '24%', delay: 0, dur: 7.5, drift: -46, size: 5 },
  { left: '42%', delay: 1.8, dur: 9, drift: -60, size: 3 },
  { left: '57%', delay: 3.2, dur: 8, drift: -52, size: 4 },
  { left: '70%', delay: 0.9, dur: 10, drift: -64, size: 3 },
  { left: '34%', delay: 4.4, dur: 8.5, drift: -50, size: 4 },
  { left: '63%', delay: 2.6, dur: 9.5, drift: -58, size: 5 },
];

export function FileDropzone({ onFiles, accept = '.txt', className }: Props) {
  const [active, setActive] = useState(false);
  const reduce = useReducedMotion();

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <label
      className={cn(
        'group relative block h-full w-full cursor-pointer',
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      {/* === 躺在床面上的夢境光毯（傾斜、貼合病床的形體） === */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1100px' }}
      >
        <motion.div
          className="relative"
          style={{
            // 沿病床「右下床尾 → 左上床頭」的對角線傾斜並壓平，使光毯像鋪在床面上。
            transformStyle: 'preserve-3d',
            transform:
              'rotateX(52deg) rotateZ(17deg) translateZ(0)',
            width: 'min(600px, 68vw)',
            height: 'min(248px, 32vh)',
          }}
          animate={
            reduce
              ? undefined
              : {
                  // 像沉睡者的呼吸：極緩慢的明暗起伏。
                  opacity: active ? 1 : [0.82, 1, 0.82],
                  scale: active ? 1.05 : [1, 1.035, 1],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        >
          {/* 外層靈光（冷色調的夢境光暈，懸浮在床面上） */}
          <div
            className="absolute -inset-20 rounded-[50%] blur-2xl transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(150,214,232,0.65), rgba(176,178,234,0.32) 48%, rgba(255,255,255,0) 74%)',
              mixBlendMode: 'screen',
              opacity: active ? 1 : 0.75,
            }}
          />
          {/* 光毯本體 */}
          <div
            className="absolute inset-0 rounded-[42%] transition-all duration-500"
            style={{
              background:
                'radial-gradient(ellipse 58% 54% at 50% 46%, rgba(236,252,255,0.95), rgba(150,210,230,0.5) 47%, rgba(178,178,236,0.18) 66%, rgba(255,255,255,0) 78%)',
              boxShadow: active
                ? '0 0 70px 22px rgba(160,216,234,0.55)'
                : '0 0 42px 12px rgba(160,216,234,0.32)',
            }}
          />
          {/* 邊緣靈環（淡淡勾勒出光毯的範圍） */}
          <div
            className="absolute inset-[14%] rounded-[50%] transition-opacity duration-500"
            style={{
              border: '1px solid rgba(170,222,238,0.5)',
              boxShadow: 'inset 0 0 24px rgba(186,224,240,0.4)',
              opacity: active ? 0.9 : 0.5,
            }}
          />
          {/* 接觸陰影（讓光毯像真的落在床墊上） */}
          <div
            className="absolute inset-x-6 bottom-1 h-12 rounded-[50%] blur-xl"
            style={{
              background:
                'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(74,92,104,0.4), rgba(74,92,104,0) 70%)',
            }}
          />
        </motion.div>
      </div>

      {/* === 漂浮光塵 === */}
      {reduce ? null : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {MOTES.map((m, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white blur-[1px]"
              style={{
                left: m.left,
                top: '62%',
                width: m.size,
                height: m.size,
              }}
              animate={{
                y: [0, m.drift],
                opacity: [0, active ? 0.9 : 0.65, 0],
              }}
              transition={{
                duration: m.dur,
                delay: m.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* === 正面浮字（不傾斜，維持易讀） === */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        animate={
          reduce ? undefined : { y: active ? -10 : 0 }
        }
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <p
          className={cn(
            'text-sm tracking-tight transition-colors duration-300',
            active
              ? 'text-neutral-900'
              : 'text-neutral-600 group-hover:text-neutral-800'
          )}
          style={{ textShadow: '0 1px 3px rgba(255,255,255,0.85)' }}
        >
          把 LINE 匯出的 .txt 安放在這裡
        </p>
        <p
          className="mt-1 text-[11px] uppercase tracking-[0.24em] text-neutral-500/80"
          style={{ textShadow: '0 1px 2px rgba(255,255,255,0.7)' }}
        >
          specimen intake · drop or click
        </p>
      </motion.div>

      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}
