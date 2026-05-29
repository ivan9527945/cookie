import { cn } from '@/lib/utils';
import type { ChatRole } from '@/types/chat';

interface Props {
  role: ChatRole;
  content: string;
  /** 在 streaming 過程中讓 assistant bubble 末端顯示閃爍的 caret */
  cursor?: boolean;
}

// 浮在視訊鏡頭畫面之上，所以用玻璃質感確保可讀性：
//   user（你 / 鏡頭裡的我）＝淺色玻璃，靠右
//   assistant（另一個我 / 蛋形 AI）＝深色玻璃，靠左
export function MessageBubble({ role, content, cursor }: Props) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm shadow-lg backdrop-blur-md',
          isUser
            ? 'bg-white/85 text-neutral-900 shadow-black/10'
            : 'border border-white/15 bg-neutral-900/65 text-neutral-50 shadow-black/30'
        )}
      >
        {content}
        {cursor ? (
          <span
            aria-hidden
            className={cn(
              'ml-0.5 inline-block h-[1em] w-[1px] translate-y-[2px] animate-[blink_1s_steps(1)_infinite]',
              isUser ? 'bg-neutral-600' : 'bg-neutral-300'
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
