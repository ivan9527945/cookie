import { cn } from '@/lib/utils';
import type { ChatRole } from '@/types/chat';

interface Props {
  role: ChatRole;
  content: string;
  /** 在 streaming 過程中讓 assistant bubble 末端顯示閃爍的 caret */
  cursor?: boolean;
}

export function MessageBubble({ role, content, cursor }: Props) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm',
          isUser
            ? 'bg-neutral-900 text-white'
            : 'border border-neutral-200 bg-white text-neutral-900'
        )}
      >
        {content}
        {cursor ? (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1em] w-[1px] translate-y-[2px] animate-[blink_1s_steps(1)_infinite] bg-neutral-600"
          />
        ) : null}
      </div>
    </div>
  );
}
