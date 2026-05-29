/**
 * 對話的「模擬模式」——僅供本地測試 chat UI / 蛋形互動用。
 *
 * 由 NEXT_PUBLIC_PERSONA_MOCK=1 開啟（與 persona 模擬共用同一個旗標）。
 * 開啟後 /api/chat 不需要真實 user / persona / Claude：訊息存在記憶體，
 * 串流一段「另一個我」口吻的回覆，讓 thinking→speaking→idle 與串流 UI 都能跑。
 */

import type {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatMode,
} from '@/types/chat';

interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const MOCK_SESSION_ID = 'mock-session';

// 掛在 globalThis：Next dev 會把這個模組在不同 route 各自打包成獨立實例，
// 用 module-level 變數無法跨 route 共享。globalThis 是同一個 process 內的單例。
const g = globalThis as unknown as {
  __mockChat?: { messages: MockMessage[]; seq: number };
};
function store() {
  if (!g.__mockChat) g.__mockChat = { messages: [], seq: 0 };
  return g.__mockChat;
}

function pushMessage(role: 'user' | 'assistant', content: string): void {
  const s = store();
  s.seq += 1;
  s.messages.push({
    id: `mock-${s.seq}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  });
}

export function clearMockChat(): void {
  store().messages.length = 0;
}

export function getMockHistory(): ChatHistoryResponse {
  const { messages } = store();
  const startedAt = messages[0]?.timestamp ?? new Date().toISOString();
  const list: ChatHistoryMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    retrievedCount:
      m.role === 'assistant' ? { chunks: 3, episodes: 1 } : undefined,
  }));
  return {
    session: { id: MOCK_SESSION_ID, startedAt },
    messages: list,
  };
}

export function mockSessionMeta() {
  const { messages } = store();
  return {
    id: MOCK_SESSION_ID,
    startedAt: messages[0]?.timestamp ?? new Date().toISOString(),
    endedAt: null,
    messageCount: messages.length,
  };
}

// 「另一個我」的回覆：刻意帶著鏡像／不安的雙生口吻。
function buildReply(message: string, mode: ChatMode): string {
  const snippet = message.trim().slice(0, 40);
  if (mode === 'simulation') {
    return `如果是你，大概會這樣回——\n「${snippet}」聽起來像在試探我。\n我懂這種感覺，因為我就是從這種句子裡長出來的。`;
  }
  return `你說「${snippet}」。\n奇怪，這句話我好像也說得出口。\n你是真的這麼想，還是只是想聽我替你說出來？`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 回一個串流 Response，逐字吐出 mock 回覆，並在開頭/結尾把 user / assistant
 * 訊息存進記憶體，讓 /api/chat/history 之後 reload 得回同樣的內容。
 */
export function mockChatResponse(message: string, mode: ChatMode): Response {
  pushMessage('user', message);
  const reply = buildReply(message, mode);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 以 1～2 字為單位吐出，模擬逐字串流（讓蛋形 speaking 脈動有東西可跟）。
      const chunks = reply.match(/[\s\S]{1,2}/g) ?? [reply];
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
        await sleep(38);
      }
      pushMessage('assistant', reply);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  });
}
