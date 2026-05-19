import type { ConversationChunk, LineMessage } from '@/types/line';

export interface ChunkOptions {
  chatRoom: string;
  /** 對話間隔超過 N 分鐘就切塊 */
  gapMinutes?: number;
  /** 塊內至少要有幾筆才保留 */
  minMessages?: number;
  /** 你至少要說過幾次才保留 */
  minYourMessages?: number;
}

export function chunkByTimeGap(
  messages: LineMessage[],
  options: ChunkOptions
): ConversationChunk[] {
  const {
    chatRoom,
    gapMinutes = 30,
    minMessages = 4,
    minYourMessages = 1,
  } = options;

  const chunks: ConversationChunk[] = [];
  const gapMs = gapMinutes * 60 * 1000;

  let buffer: LineMessage[] = [];
  let lastTime: Date | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    const yourMsgs = buffer.filter((m) => m.isYou && m.type === 'text');
    if (buffer.length >= minMessages && yourMsgs.length >= minYourMessages) {
      const participants = Array.from(new Set(buffer.map((m) => m.speaker)));
      chunks.push({
        id: `${chatRoom}_${buffer[0].timestamp.getTime()}`,
        chatRoom,
        startTime: buffer[0].timestamp,
        endTime: buffer[buffer.length - 1].timestamp,
        participants,
        messages: buffer,
        yourMessages: yourMsgs,
      });
    }
    buffer = [];
  };

  for (const msg of messages) {
    if (lastTime && msg.timestamp.getTime() - lastTime.getTime() > gapMs) {
      flush();
    }
    buffer.push(msg);
    lastTime = msg.timestamp;
  }
  flush();

  return chunks;
}
