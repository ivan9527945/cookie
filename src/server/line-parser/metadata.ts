/**
 * Lightweight metadata extraction — 在沒有 selfName 的前提下也能跑，
 * 用於 onboarding 預覽階段（讓使用者確認後再正式 ingest）。
 */

export interface SpeakerStat {
  name: string;
  messageCount: number;
}

export interface FileMetadata {
  /** 第一行 `[LINE] 與 X 的聊天紀錄` 抓到的聊天室名稱 */
  chatRoom: string | null;
  /** 依 speaker 數量推斷：3 人以上視為群組 */
  detectedType: 'private' | 'group';
  /** 依出現次數降冪排序 */
  speakers: SpeakerStat[];
  messageCount: number;
  startTime: Date | null;
  endTime: Date | null;
}

const TITLE_LINE = /^\[LINE\]\s+(?:與|Chat with)\s+(.+?)\s+(?:的聊天紀錄|chat history)/i;
const DATE_LINE = /^(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})/;
const MSG_LINE = /^(\d{1,2}):(\d{2})\s+(.+?)\s+(.+)$/;

export function extractFileMetadata(raw: string): FileMetadata {
  const cleaned = raw.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);

  const chatRoom = lines.length > 0 ? lines[0].match(TITLE_LINE)?.[1]?.trim() ?? null : null;

  const speakerCounts = new Map<string, number>();
  let messageCount = 0;
  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let currentDate: Date | null = null;

  for (const line of lines) {
    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      currentDate = new Date(
        parseInt(dateMatch[1], 10),
        parseInt(dateMatch[2], 10) - 1,
        parseInt(dateMatch[3], 10)
      );
      continue;
    }
    const msgMatch = line.match(MSG_LINE);
    if (msgMatch && currentDate) {
      const [, hh, mm, speaker] = msgMatch;
      const ts = new Date(currentDate);
      ts.setHours(parseInt(hh, 10), parseInt(mm, 10));
      if (!startTime) startTime = ts;
      endTime = ts;
      messageCount += 1;
      speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + 1);
    }
  }

  const speakers: SpeakerStat[] = Array.from(speakerCounts.entries())
    .map(([name, c]) => ({ name, messageCount: c }))
    .sort((a, b) => b.messageCount - a.messageCount);

  return {
    chatRoom,
    detectedType: speakers.length >= 3 ? 'group' : 'private',
    speakers,
    messageCount,
    startTime,
    endTime,
  };
}
