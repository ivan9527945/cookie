export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ChatRequestBody {
  sessionId?: string;
  message: string;
}
