export interface SpeakerStat {
  name: string;
  messageCount: number;
}

export interface FilePreview {
  filename: string;
  fileSize: number;
  chatRoom: string;
  detectedType: 'private' | 'group';
  speakers: SpeakerStat[];
  messageCount: number;
  startTime: string | null;
  endTime: string | null;
}

export interface IngestFileMeta {
  filename: string;
  chatRoom: string;
  chatType: 'private' | 'group';
  notes?: string;
}

export interface IngestRequestMeta {
  selfName: string;
  files: IngestFileMeta[];
}

export interface IngestChatResult {
  uploadedChatId: string;
  chatRoom: string;
  messageCount: number;
  chunkCount: number;
}

export interface IngestResponse {
  userId: string;
  chats: IngestChatResult[];
  totalMessages: number;
  totalChunks: number;
}
