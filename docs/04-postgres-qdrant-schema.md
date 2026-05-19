# Postgres + Qdrant Schema 設計

本文件規範 Cookie 專案的資料層架構。兩個資料庫各司其職：

- **Postgres**：結構化資料（使用者、對話紀錄、persona profile、訊息原文、episodic memory metadata）
- **Qdrant**：向量檢索（語料 embedding、episodic memory embedding）

兩者透過 `id` 互相對應，Postgres 是 source of truth，Qdrant 是檢索層。

---

## 一、整體資料模型

```
┌────────────────────────────────────────────────────────┐
│                       Postgres                          │
│                                                         │
│  User ──┬── UploadedChat ── LineMessage                │
│         │                                               │
│         ├── ConversationChunk ── ChunkAnnotation        │
│         │                                               │
│         ├── PersonaProfile (versioned)                  │
│         │                                               │
│         ├── ChatSession ── Episode                      │
│         │                                               │
│         └── AuditLog                                    │
└────────────────────────────────────────────────────────┘
                          │
                          │ (foreign keys via UUID)
                          │
┌─────────────────────────▼──────────────────────────────┐
│                        Qdrant                           │
│                                                         │
│  Collection: chunks        (語料記憶, 訓練資料)         │
│  Collection: episodes      (互動後產生的長期記憶)       │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 二、Prisma Schema

`prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 啟用 pgvector extension（雖然主要用 Qdrant，pg 也可備援存小型 embedding）
  extensions = [vector]
}

// =====================================================
// User
// =====================================================
model User {
  id          String   @id @default(uuid()) @db.Uuid
  name        String                                    // 你在 LINE 上顯示的名稱（識別 isYou）
  displayName String                                    // UI 顯示用
  email       String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  uploadedChats     UploadedChat[]
  personaProfiles   PersonaProfile[]
  chatSessions      ChatSession[]
  auditLogs         AuditLog[]

  @@map("users")
}

// =====================================================
// LINE 匯入相關
// =====================================================
model UploadedChat {
  id          String     @id @default(uuid()) @db.Uuid
  userId      String     @db.Uuid
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  chatRoom    String                                    // 聊天室名稱（對方名 / 群組名）
  chatType    ChatType   @default(private)
  filename    String                                    // 上傳的原始檔名
  fileSize    Int                                       // bytes
  messageCount Int       @default(0)
  notes       String?                                   // 使用者備註

  uploadedAt  DateTime   @default(now())
  /// 原始 .txt 何時被刪除（隱私要求：成功處理後 24h 內）
  rawDeletedAt DateTime?

  messages    LineMessage[]
  chunks      ConversationChunk[]

  @@index([userId])
  @@map("uploaded_chats")
}

enum ChatType {
  private
  group
}

model LineMessage {
  id            String        @id @default(uuid()) @db.Uuid
  uploadedChatId String       @db.Uuid
  uploadedChat  UploadedChat  @relation(fields: [uploadedChatId], references: [id], onDelete: Cascade)

  timestamp     DateTime
  speaker       String
  isYou         Boolean
  type          MessageType   @default(text)
  content       String        @db.Text

  // 屬於哪個 chunk（在 chunking 階段填入）
  chunkId       String?       @db.Uuid
  chunk         ConversationChunk? @relation(fields: [chunkId], references: [id], onDelete: SetNull)

  @@index([uploadedChatId, timestamp])
  @@index([chunkId])
  @@map("line_messages")
}

enum MessageType {
  text
  sticker
  image
  video
  file
  voice
  url
  system
}

// =====================================================
// Chunking + Annotation
// =====================================================
model ConversationChunk {
  id              String       @id @default(uuid()) @db.Uuid
  uploadedChatId  String       @db.Uuid
  uploadedChat    UploadedChat @relation(fields: [uploadedChatId], references: [id], onDelete: Cascade)

  startTime       DateTime
  endTime         DateTime
  participants    String[]                              // Postgres text[]
  messageCount    Int
  yourMessageCount Int

  // === 標註結果（Chunk Annotation） ===
  summary         String?      @db.Text
  chatType        String?                               // work / casual / technical / family / romantic / other
  emotionalTone   String?                               // neutral / happy / frustrated / ...
  yourPosition    String?      @db.Text
  topics          String[]
  importance      Int?                                  // 1-10
  annotatedAt     DateTime?

  // === Embedding 狀態 ===
  embeddedAt      DateTime?                             // 何時 push 到 Qdrant
  qdrantPointId   String?      @unique                  // Qdrant 中的 point ID（同 chunk id 即可）

  messages        LineMessage[]

  @@index([uploadedChatId])
  @@index([chatType])
  @@index([importance])
  @@map("conversation_chunks")
}

// =====================================================
// Persona Profile (versioned)
// =====================================================
model PersonaProfile {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @db.Uuid
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  version         Int                                   // 從 1 開始遞增
  parentVersionId String?  @db.Uuid                     // 上一版本 ID（版本鏈）
  isActive        Boolean  @default(false)              // 當前生效版本

  // === 抽取結果（JSONB 儲存完整 PersonaProfile） ===
  profile         Json                                  // 完整 schema 見 types/persona.ts

  // === 使用者手動覆寫（與 profile 合併使用） ===
  manualOverrides Json?

  // === Metadata ===
  basedOnMessages Int                                   // 基於多少訊息訓練出來
  generatedAt     DateTime @default(now())
  generationCost  Decimal?                              // 美元，方便使用者了解
  generationModel String?                               // e.g. "claude-opus-4-7"

  @@unique([userId, version])
  @@index([userId, isActive])
  @@map("persona_profiles")
}

// =====================================================
// 對話 Session + Episodic Memory
// =====================================================
model ChatSession {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String?                                   // 自動生成或使用者命名
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  messageCount Int      @default(0)

  messages    ChatMessage[]
  episodes    Episode[]

  @@index([userId, startedAt(sort: Desc)])
  @@map("chat_sessions")
}

model ChatMessage {
  id          String      @id @default(uuid()) @db.Uuid
  sessionId   String      @db.Uuid
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  role        ChatRole
  content     String      @db.Text
  timestamp   DateTime    @default(now())

  // === Metadata ===
  tokensUsed  Int?
  modelUsed   String?
  /// 這則回應檢索到了哪些記憶（用於除錯與 transparency）
  retrievedChunkIds   String[]   @db.Uuid
  retrievedEpisodeIds String[]   @db.Uuid

  @@index([sessionId, timestamp])
  @@map("chat_messages")
}

enum ChatRole {
  user
  assistant
  system
}

model Episode {
  id          String      @id @default(uuid()) @db.Uuid
  sessionId   String      @db.Uuid
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // === 內容 ===
  summary     String      @db.Text                       // LLM 抽取的摘要
  rawContext  String?     @db.Text                       // 原始對話片段（可選）
  importance  Int                                        // 1-10
  emotionalValence Float?                                // -1.0 to 1.0

  // === Embedding 狀態 ===
  qdrantPointId String?   @unique                        // 同 episode id 即可
  embeddedAt    DateTime?

  // === 關聯 ===
  /// 與其他 episode 的關聯（記憶網絡）
  linkedEpisodeIds String[] @db.Uuid

  createdAt   DateTime    @default(now())
  /// 軟刪除：保留紀錄但不再被檢索
  deletedAt   DateTime?

  @@index([sessionId])
  @@index([importance])
  @@map("episodes")
}

// =====================================================
// Audit Log（隱私與安全）
// =====================================================
model AuditLog {
  id        String      @id @default(uuid()) @db.Uuid
  userId    String      @db.Uuid
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  action    AuditAction
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime    @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@map("audit_logs")
}

enum AuditAction {
  upload_chat
  delete_chat
  generate_persona
  edit_persona
  chat_session_start
  data_export
  data_purge
}
```

---

## 三、Qdrant Collections

兩個 collection，分別存「訓練語料」與「互動記憶」。

### 3.1 Collection: `chunks`

語料記憶：來自 LINE 對話的歷史 chunks。

**建立指令**

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

await qdrant.createCollection('chunks', {
  vectors: {
    size: 1536,                   // text-embedding-3-small
    distance: 'Cosine',
  },
  // HNSW 索引調參：訓練語料寫一次讀很多次
  hnsw_config: {
    m: 32,
    ef_construct: 200,
  },
  optimizers_config: {
    indexing_threshold: 10000,    // 達到 10k point 才建索引
  },
  // payload 上要支援 filter
  on_disk_payload: false,
});

// 建立 payload index 加速過濾
await qdrant.createPayloadIndex('chunks', {
  field_name: 'userId',
  field_schema: 'keyword',
});
await qdrant.createPayloadIndex('chunks', {
  field_name: 'chatType',
  field_schema: 'keyword',
});
await qdrant.createPayloadIndex('chunks', {
  field_name: 'importance',
  field_schema: 'integer',
});
await qdrant.createPayloadIndex('chunks', {
  field_name: 'startTime',
  field_schema: 'datetime',
});
```

**Point Schema**

```typescript
interface ChunkPoint {
  id: string;                      // = ConversationChunk.id (UUID)
  vector: number[];                // 1536 dims
  payload: {
    userId: string;                // 用於多租戶過濾（雖然當前是單人 app，留著好擴充）
    uploadedChatId: string;
    chatRoom: string;
    chatType: string;
    summary: string;               // 摘要原文（給 LLM context 用）
    yourPosition: string | null;
    topics: string[];
    importance: number;
    emotionalTone: string;
    startTime: string;             // ISO datetime
    endTime: string;
    participants: string[];
  };
}
```

**Embedding 對象**：將 `summary + yourPosition + topics` 串成一段文字後 embed，而非原始訊息。理由：
- 原始訊息太碎，語意密度低
- 摘要 + 立場是濃縮過的語意，檢索準確度高
- 省 embedding 成本

**插入範例**

```typescript
import { embed } from '@/lib/embedding';

async function indexChunk(chunk: ConversationChunk, annotation: ChunkAnnotation) {
  const embedText = [
    annotation.summary,
    annotation.yourPosition ? `立場：${annotation.yourPosition}` : '',
    `主題：${annotation.topics.join('、')}`,
  ].filter(Boolean).join('\n');

  const vector = await embed(embedText);

  await qdrant.upsert('chunks', {
    points: [
      {
        id: chunk.id,
        vector,
        payload: {
          userId: chunk.userId,
          uploadedChatId: chunk.uploadedChatId,
          chatRoom: chunk.chatRoom,
          chatType: annotation.chatType,
          summary: annotation.summary,
          yourPosition: annotation.yourPosition || null,
          topics: annotation.topics,
          importance: annotation.importance,
          emotionalTone: annotation.emotionalTone,
          startTime: chunk.startTime.toISOString(),
          endTime: chunk.endTime.toISOString(),
          participants: chunk.participants,
        },
      },
    ],
  });

  // 同步更新 Postgres
  await db.conversationChunk.update({
    where: { id: chunk.id },
    data: {
      embeddedAt: new Date(),
      qdrantPointId: chunk.id,
    },
  });
}
```

---

### 3.2 Collection: `episodes`

互動記憶：Cookie 啟動後，與使用者對話過程中累積的長期記憶。

```typescript
await qdrant.createCollection('episodes', {
  vectors: {
    size: 1536,
    distance: 'Cosine',
  },
  hnsw_config: {
    m: 16,                         // episodes 規模較小，m 可低
    ef_construct: 100,
  },
});

await qdrant.createPayloadIndex('episodes', {
  field_name: 'userId',
  field_schema: 'keyword',
});
await qdrant.createPayloadIndex('episodes', {
  field_name: 'sessionId',
  field_schema: 'keyword',
});
await qdrant.createPayloadIndex('episodes', {
  field_name: 'importance',
  field_schema: 'integer',
});
```

**Point Schema**

```typescript
interface EpisodePoint {
  id: string;                       // = Episode.id
  vector: number[];                 // 1536 dims
  payload: {
    userId: string;
    sessionId: string;
    summary: string;
    importance: number;
    emotionalValence: number;
    createdAt: string;
  };
}
```

---

## 四、檢索 Pipeline

`src/server/memory/retrieve.ts`

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import { embed } from '@/lib/embedding';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

export interface RetrievalResult {
  chunks: Array<{
    id: string;
    score: number;
    summary: string;
    yourPosition: string | null;
    topics: string[];
    importance: number;
  }>;
  episodes: Array<{
    id: string;
    score: number;
    summary: string;
    importance: number;
    createdAt: string;
  }>;
}

export async function retrieveMemories(
  query: string,
  userId: string,
  options: {
    chunkLimit?: number;
    episodeLimit?: number;
    minImportance?: number;
  } = {}
): Promise<RetrievalResult> {
  const {
    chunkLimit = 5,
    episodeLimit = 3,
    minImportance = 4,
  } = options;

  const queryVector = await embed(query);

  // 平行檢索兩個 collection
  const [chunkRes, episodeRes] = await Promise.all([
    qdrant.search('chunks', {
      vector: queryVector,
      limit: chunkLimit,
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'importance', range: { gte: minImportance } },
        ],
      },
      with_payload: true,
    }),
    qdrant.search('episodes', {
      vector: queryVector,
      limit: episodeLimit,
      filter: {
        must: [{ key: 'userId', match: { value: userId } }],
      },
      with_payload: true,
    }),
  ]);

  return {
    chunks: chunkRes.map((p) => ({
      id: p.id as string,
      score: p.score,
      summary: p.payload!.summary as string,
      yourPosition: p.payload!.yourPosition as string | null,
      topics: p.payload!.topics as string[],
      importance: p.payload!.importance as number,
    })),
    episodes: episodeRes.map((p) => ({
      id: p.id as string,
      score: p.score,
      summary: p.payload!.summary as string,
      importance: p.payload!.importance as number,
      createdAt: p.payload!.createdAt as string,
    })),
  };
}
```

---

## 五、Episodic Memory 抽取

對話結束後（或每 N 輪）跑一次背景 job：

`src/server/memory/episodic.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const EXTRACT_PROMPT = `分析以下對話，判斷其中是否包含值得長期記住的資訊。

「值得記住」的標準：
- 使用者透露了未來會反覆出現的偏好、習慣、計畫
- 使用者提到了重要的人、事、時間點
- 使用者表達了關鍵情緒或反思
- 使用者明確要求記住的事

不要記住：
- 純打招呼、閒聊
- 一次性的問答（如「現在幾點」）
- 已經明顯能從 persona profile 推得的資訊

輸出 JSON 陣列，每個元素：
{
  "summary": string,           // 50-100 字繁體中文摘要
  "importance": number,        // 1-10
  "emotionalValence": number   // -1.0 ~ 1.0
}

若沒有值得記住的內容，輸出 []`;

export async function extractEpisodes(
  sessionId: string,
  recentTurns: ChatMessage[]
) {
  const dialogue = recentTurns
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n');

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: dialogue }],
  });

  const text = res.content[0].type === 'text' ? res.content[0].text : '[]';
  const episodes: Array<{
    summary: string;
    importance: number;
    emotionalValence: number;
  }> = JSON.parse(text);

  // 寫入 Postgres + Qdrant
  for (const ep of episodes) {
    if (ep.importance < 4) continue;  // 低重要性不存

    const id = crypto.randomUUID();
    const vector = await embed(ep.summary);

    await db.episode.create({
      data: {
        id,
        sessionId,
        summary: ep.summary,
        importance: ep.importance,
        emotionalValence: ep.emotionalValence,
        qdrantPointId: id,
        embeddedAt: new Date(),
      },
    });

    await qdrant.upsert('episodes', {
      points: [
        {
          id,
          vector,
          payload: {
            userId: /* session.userId */,
            sessionId,
            summary: ep.summary,
            importance: ep.importance,
            emotionalValence: ep.emotionalValence,
            createdAt: new Date().toISOString(),
          },
        },
      ],
    });
  }
}
```

---

## 六、資料一致性與清理

### Cascade 刪除

刪除 `UploadedChat` 時：
- Postgres：自動 cascade 刪除底下的 `LineMessage` 與 `ConversationChunk`
- Qdrant：**不會**自動同步，必須在 API 層手動處理

```typescript
async function deleteUploadedChat(chatId: string) {
  // 1. 找出所有相關 chunk ids
  const chunks = await db.conversationChunk.findMany({
    where: { uploadedChatId: chatId },
    select: { qdrantPointId: true },
  });
  const pointIds = chunks
    .map((c) => c.qdrantPointId)
    .filter((id): id is string => id !== null);

  // 2. 從 Qdrant 刪除
  if (pointIds.length > 0) {
    await qdrant.delete('chunks', { points: pointIds });
  }

  // 3. 從 Postgres cascade 刪除
  await db.uploadedChat.delete({ where: { id: chatId } });

  // 4. Audit
  await db.auditLog.create({
    data: {
      userId: /* ... */,
      action: 'delete_chat',
      details: { chatId, removedPoints: pointIds.length },
    },
  });
}
```

### 完整資料清除

使用者要求清空時：

```typescript
async function purgeAllUserData(userId: string) {
  // Qdrant: 用 filter 批次刪除
  await qdrant.delete('chunks', {
    filter: { must: [{ key: 'userId', match: { value: userId } }] },
  });
  await qdrant.delete('episodes', {
    filter: { must: [{ key: 'userId', match: { value: userId } }] },
  });

  // Postgres: cascade 從 User 開始
  await db.user.delete({ where: { id: userId } });
}
```

---

## 七、Migration 與初始化

`prisma/migrations/...`

第一次 migration 後，手動執行：

```sql
-- pgvector extension (備援用，主要走 Qdrant)
CREATE EXTENSION IF NOT EXISTS vector;
```

Qdrant collections 用 `scripts/init-qdrant.ts`：

```typescript
// scripts/init-qdrant.ts
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

async function main() {
  const collections = await qdrant.getCollections();
  const names = collections.collections.map((c) => c.name);

  if (!names.includes('chunks')) {
    await qdrant.createCollection('chunks', {
      vectors: { size: 1536, distance: 'Cosine' },
      hnsw_config: { m: 32, ef_construct: 200 },
    });
    await qdrant.createPayloadIndex('chunks', {
      field_name: 'userId',
      field_schema: 'keyword',
    });
    // ... 其他 indexes
    console.log('✓ chunks collection created');
  }

  if (!names.includes('episodes')) {
    await qdrant.createCollection('episodes', {
      vectors: { size: 1536, distance: 'Cosine' },
    });
    // ... indexes
    console.log('✓ episodes collection created');
  }
}

main();
```

`package.json` 加：

```json
"scripts": {
  "qdrant:init": "tsx scripts/init-qdrant.ts"
}
```

---

## 八、容量規劃

以 5 年 LINE 對話為例：

| 資料 | 預估規模 | 儲存 |
|------|---------|------|
| `LineMessage` | 200,000 筆 | Postgres ~100 MB |
| `ConversationChunk` | 10,000 個 | Postgres ~20 MB |
| Qdrant `chunks` | 10,000 vectors × 1536 dims × 4 bytes | ~60 MB + index |
| `Episode`（一年互動）| ~2,000 | Postgres ~2 MB |
| Qdrant `episodes` | 2,000 vectors | ~12 MB |

Railway 預設 Postgres 1GB 額度綽綽有餘，Qdrant 在 Railway 跑單 instance 也 OK。

---

## 九、查詢效能優化

### 常見查詢

```typescript
// 查詢使用者目前生效的 persona
const activePersona = await db.personaProfile.findFirst({
  where: { userId, isActive: true },
});

// 查詢某 session 最近 N 則訊息
const recentMessages = await db.chatMessage.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'desc' },
  take: 20,
});

// 查詢未 embed 的 chunks（背景 job 用）
const pendingChunks = await db.conversationChunk.findMany({
  where: {
    embeddedAt: null,
    annotatedAt: { not: null },
  },
  take: 100,
});
```

### 索引涵蓋

`@@index` 已涵蓋常用查詢路徑。實際上線後可用 `pg_stat_statements` 觀察慢查詢再補。

---

## 十、Checklist

- [ ] Prisma migrate 跑得通，pgvector extension 安裝成功
- [ ] Qdrant init script 冪等（重複跑不會報錯）
- [ ] 兩個 collection 的 payload indexes 都建立
- [ ] 寫入 chunk 時 Postgres ↔ Qdrant 雙寫成功
- [ ] 刪除 chat 時兩邊都正確清空，無孤兒 vector
- [ ] User cascade 刪除測試通過
- [ ] Audit log 在每個 mutation 都有寫入
- [ ] 容量壓力測試：10k chunks 寫入 < 5 分鐘、檢索 p99 < 200ms
