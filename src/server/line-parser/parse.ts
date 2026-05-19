import type { LineMessage, ParseOptions } from '@/types/line';

const DATE_LINE = /^(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2}).*$/;
const MSG_LINE = /^(\d{1,2}):(\d{2})\s+(.+?)\s+(.+)$/;

const MEDIA_TOKENS: Record<string, LineMessage['type']> = {
  '[貼圖]': 'sticker',
  貼圖: 'sticker',
  '[照片]': 'image',
  照片: 'image',
  圖片: 'image',
  '[影片]': 'video',
  影片: 'video',
  '[檔案]': 'file',
  檔案: 'file',
  '[語音訊息]': 'voice',
  語音訊息: 'voice',
};

export function parseLineTxt(raw: string, opts: ParseOptions): LineMessage[] {
  const cleaned = raw.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);

  const messages: LineMessage[] = [];
  let currentDate: Date | null = null;
  let pending: LineMessage | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      if (pending) {
        messages.push(pending);
        pending = null;
      }
      continue;
    }

    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      currentDate = new Date(
        parseInt(dateMatch[1], 10),
        parseInt(dateMatch[2], 10) - 1,
        parseInt(dateMatch[3], 10)
      );
      if (pending) {
        messages.push(pending);
        pending = null;
      }
      continue;
    }

    const msgMatch = line.match(MSG_LINE);
    if (msgMatch && currentDate) {
      if (pending) messages.push(pending);
      const [, hh, mm, speaker, rawContent] = msgMatch;
      const ts = new Date(currentDate);
      ts.setHours(parseInt(hh, 10), parseInt(mm, 10));
      pending = buildMessage(ts, speaker, rawContent, opts.selfName);
    } else if (pending) {
      pending.content += '\n' + line.trim();
    }
  }
  if (pending) messages.push(pending);

  return messages;
}

function buildMessage(
  timestamp: Date,
  speaker: string,
  rawContent: string,
  selfName: string
): LineMessage {
  let type: LineMessage['type'] = 'text';
  let content = rawContent.trim();

  const mediaType = MEDIA_TOKENS[content];
  if (mediaType) {
    type = mediaType;
  } else if (/^https?:\/\//.test(content)) {
    type = 'url';
    content = '<URL>';
  } else if (content === '已收回訊息' || content.startsWith('☎')) {
    type = 'system';
  }

  return {
    timestamp,
    speaker,
    content,
    type,
    isYou: speaker === selfName,
  };
}
