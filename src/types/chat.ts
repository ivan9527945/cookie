export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export type ChatMode = 'mirror' | 'simulation';

export interface ChatRequestBody {
  sessionId?: string;
  message: string;
  mode?: ChatMode;
}

export interface RetrievedCount {
  chunks: number;
  episodes: number;
}

export interface ChatHistoryMessage extends ChatTurn {
  id: string;
  timestamp: string;
  retrievedCount?: RetrievedCount;
}

export interface ChatHistoryResponse {
  session: {
    id: string;
    startedAt: string;
  } | null;
  messages: ChatHistoryMessage[];
}

export interface ChatSessionMeta {
  id: string;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
}
