import { cn } from '@/lib/utils';
import type { ChatRole } from '@/types/chat';

interface Props {
  role: ChatRole;
  content: string;
}

export function MessageBubble({ role, content }: Props) {
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
      </div>
    </div>
  );
}
