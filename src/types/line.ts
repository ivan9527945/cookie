import { z } from 'zod';

export const LineMessageSchema = z.object({
  timestamp: z.date(),
  speaker: z.string(),
  content: z.string(),
  type: z.enum([
    'text',
    'sticker',
    'image',
    'video',
    'file',
    'voice',
    'url',
    'system',
  ]),
  isYou: z.boolean(),
});

export type LineMessage = z.infer<typeof LineMessageSchema>;
export type LineMessageType = LineMessage['type'];

export interface ParseOptions {
  /** 使用者在 LINE 中顯示的名稱（用來識別 `isYou`） */
  selfName: string;
  /** 群組名或對方名稱（從檔名或第一行讀取） */
  chatRoom: string;
}

export type ChatType =
  | 'work'
  | 'casual'
  | 'technical'
  | 'family'
  | 'romantic'
  | 'other';

export type EmotionalTone =
  | 'neutral'
  | 'happy'
  | 'frustrated'
  | 'anxious'
  | 'reflective'
  | 'humorous'
  | 'serious';

export interface ConversationChunk {
  id: string;
  chatRoom: string;
  startTime: Date;
  endTime: Date;
  participants: string[];
  messages: LineMessage[];
  yourMessages: LineMessage[];
}

export interface ChunkAnnotation {
  summary: string;
  chatType: ChatType;
  emotionalTone: EmotionalTone;
  yourPosition?: string;
  topics: string[];
  importance: number;
}

export interface AnnotatedChunk extends ConversationChunk, ChunkAnnotation {}
