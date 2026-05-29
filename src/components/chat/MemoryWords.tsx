'use client';

// 背景：記憶基質 ——「它是用你說過的話組成的」。
// 遠處極淡地飄著對話碎片，像它賴以成形的材料懸在空氣裡。
//
// 目前用佔位字串池；之後可把真實 retrieval（它「想起」的那幾段對話）透過
// `fragments` prop 餵進來，背景就會浮現當下被喚起的記憶。

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// 佔位碎片：刻意短、曖昧，像隨手翻到的聊天截面。之後以真實資料取代。
const PLACEHOLDER_FRAGMENTS = [
  '在嗎',
  '我在',
  '晚點再說',
  '你先睡吧',
  '我也是這樣想的',
  '其實我…',
  '沒事，真的',
  '別擔心',
  '謝謝你',
  '你還記得那天嗎',
  '改天約',
  '我知道了',
];

// 每個碎片的擺位與節奏（避開正中央，散在四周遠景）。
const SLOTS = [
  { left: '8%', top: '24%', size: 13, dur: 22, delay: 0 },
  { left: '30%', top: '14%', size: 11, dur: 26, delay: 3 },
  { left: '63%', top: '20%', size: 12, dur: 24, delay: 6 },
  { left: '82%', top: '32%', size: 11, dur: 28, delay: 1.5 },
  { left: '14%', top: '54%', size: 12, dur: 25, delay: 4.5 },
  { left: '88%', top: '60%', size: 13, dur: 23, delay: 2 },
  { left: '22%', top: '82%', size: 11, dur: 27, delay: 7 },
  { left: '54%', top: '88%', size: 12, dur: 24, delay: 5 },
  { left: '72%', top: '78%', size: 11, dur: 29, delay: 8 },
  { left: '40%', top: '50%', size: 12, dur: 26, delay: 9 },
  { left: '6%', top: '40%', size: 11, dur: 28, delay: 6.5 },
  { left: '92%', top: '46%', size: 12, dur: 25, delay: 3.5 },
];

export function MemoryWords({
  fragments = PLACEHOLDER_FRAGMENTS,
  className,
}: {
  fragments?: string[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (fragments.length === 0) return null;

  return (
    <div className={cn('overflow-hidden', className)} aria-hidden>
      {SLOTS.map((slot, i) => {
        const text = fragments[i % fragments.length];
        return (
          <motion.span
            key={i}
            className="absolute select-none font-mono tracking-[0.18em] text-neutral-600"
            style={{
              left: slot.left,
              top: slot.top,
              fontSize: slot.size,
              filter: 'blur(0.3px)',
              textShadow: '0 1px 8px rgba(255,255,255,0.6)',
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={
              reduce
                ? { opacity: 0.16 }
                : { opacity: [0, 0.24, 0.24, 0], y: [10, -10] }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: slot.dur,
                    delay: slot.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
          >
            {text}
          </motion.span>
        );
      })}
    </div>
  );
}
