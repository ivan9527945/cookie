# LINE Parser + Persona 生成 Prompt 設計

本文件規範兩件事：
1. 如何把 LINE 匯出的 `.txt` 解析成結構化資料
2. 如何用 LLM 從這批資料中抽取出 Persona Profile

兩者是一條 pipeline 上的前後段。

---

## 一、LINE `.txt` 格式分析

LINE 在不同平台匯出的格式略有差異，parser 必須吃下這些變體。

### iOS 格式（最常見）

```
[LINE] 與 小明 的聊天紀錄
儲存日期：2025/03/15 14:23

2024/01/05(週一)
14:23	Satoshi	今天 PR review 真的有夠累
14:25	小明	辛苦了 RxJS 那段我看不懂
14:26	Satoshi	哈哈我等等錄個影片解釋
14:30	Satoshi	[貼圖]
14:32	Satoshi	https://example.com/something
14:35	小明	謝謝！
14:40	Satoshi	[照片]

2024/01/06(週二)
09:15	Satoshi	早安
```

### Android 格式

格式幾乎相同，但日期分隔線可能是 `2024-01-05（週一）` 或 `2024/01/05（Mon）`，且某些版本會用 `——` 取代分隔。

### 群組對話

第一行會是 `[LINE] 與 <群組名> 的聊天紀錄`，訊息格式不變。

### 特殊行

| 內容 | 處理 |
|------|------|
| `[貼圖]` | 標記為 `sticker`，內容捨棄 |
| `[照片]` / `[影片]` / `[檔案]` | 標記類型，內容捨棄 |
| `[語音訊息]` | 標記類型，內容捨棄 |
| URL | 保留，但替換為 `<URL>` token |
| 已收回訊息 | `已收回訊息`，整筆捨棄 |
| 通話紀錄 | `☎ 通話時間 00:05:23`，整筆捨棄 |
| 多行訊息 | 第二行起無時間戳，需合併回上一筆 |

---

## 二、Parser 實作

`src/server/line-parser/parse.ts`

```typescript
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

export interface ParseOptions {
  /** 使用者在 LINE 中顯示的名稱（用來識別 `isYou`） */
  selfName: string;
  /** 群組名或對方名稱（從檔名或第一行讀取） */
  chatRoom: string;
}

const DATE_LINE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2}).*$/;
const MSG_LINE = /^(\d{1,2}):(\d{2})\s+(.+?)\s+(.+)$/;

export function parseLineTxt(raw: string, opts: ParseOptions): LineMessage[] {
  // 處理 BOM
  const cleaned = raw.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);
  const messages: LineMessage[] = [];
  let currentDate: Date | null = null;
  let pending: LineMessage | null = null;

  for (const line of lines) {
    // 空行 → 結算 pending
    if (!line.trim()) {
      if (pending) {
        messages.push(pending);
        pending = null;
      }
      continue;
    }

    // 日期分隔行
    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      currentDate = new Date(
        parseInt(dateMatch[1]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[3])
      );
      if (pending) {
        messages.push(pending);
        pending = null;
      }
      continue;
    }

    // 訊息行
    const msgMatch = line.match(MSG_LINE);
    if (msgMatch && currentDate) {
      // 結算上一筆
      if (pending) messages.push(pending);

      const [, hh, mm, speaker, rawContent] = msgMatch;
      const ts = new Date(currentDate);
      ts.setHours(parseInt(hh), parseInt(mm));

      pending = buildMessage(ts, speaker, rawContent, opts.selfName);
    } else if (pending) {
      // 多行訊息：append 到 pending
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

  if (content === '[貼圖]') type = 'sticker';
  else if (content === '[照片]') type = 'image';
  else if (content === '[影片]') type = 'video';
  else if (content === '[檔案]') type = 'file';
  else if (content === '[語音訊息]') type = 'voice';
  else if (/^https?:\/\//.test(content)) {
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
```

### 多檔案匯入支援

LINE 沒有「一鍵全部匯出」功能，每個聊天室是一個 `.txt`。前端要支援多檔案上傳，並讓使用者標註：

```typescript
interface UploadedChat {
  file: File;
  chatRoom: string;     // 自動從第一行抓 / 也讓使用者編輯
  chatType: 'private' | 'group';
  notes?: string;
}
```

---

## 三、對話分塊（Chunking）

LINE 訊息很碎，單筆 embedding 沒意義。我們以「時間窗口」分塊：

`src/server/line-parser/chunk.ts`

```typescript
export interface ConversationChunk {
  id: string;
  chatRoom: string;
  startTime: Date;
  endTime: Date;
  participants: string[];
  messages: LineMessage[];
  /** 你在這段對話中說過的話（用來做 persona 訓練） */
  yourMessages: LineMessage[];
}

export function chunkByTimeGap(
  messages: LineMessage[],
  options: {
    chatRoom: string;
    gapMinutes?: number;        // 對話間隔超過 N 分鐘就切塊
    minMessages?: number;       // 塊內至少要有幾筆才保留
    minYourMessages?: number;   // 你至少要說過幾次
  }
): ConversationChunk[] {
  const {
    gapMinutes = 30,
    minMessages = 4,
    minYourMessages = 1,
    chatRoom,
  } = options;
  const chunks: ConversationChunk[] = [];
  const gapMs = gapMinutes * 60 * 1000;

  let buffer: LineMessage[] = [];
  let lastTime: Date | null = null;

  const flush = () => {
    const yourMsgs = buffer.filter((m) => m.isYou && m.type === 'text');
    if (
      buffer.length >= minMessages &&
      yourMsgs.length >= minYourMessages
    ) {
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
```

預估規模：兩三年的 LINE 對話約有 2,000–10,000 個 chunks，每個 chunk 平均 10–30 筆訊息。

---

## 四、Chunk 標註（自動 metadata 抽取）

每個 chunk 跑一次 Claude Haiku 做標註，產出輕量 metadata：

`src/server/line-parser/annotate.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export interface ChunkAnnotation {
  summary: string;              // 30-50 字摘要
  chatType: 'work' | 'casual' | 'technical' | 'family' | 'romantic' | 'other';
  emotionalTone:
    | 'neutral'
    | 'happy'
    | 'frustrated'
    | 'anxious'
    | 'reflective'
    | 'humorous'
    | 'serious';
  yourPosition?: string;        // 你在這段對話中的觀點/立場
  topics: string[];             // 1-3 個關鍵字
  importance: number;           // 1-10, 對「了解你是誰」的重要程度
}

const ANNOTATION_PROMPT = `你是一個對話分析助手，任務是分析使用者在 LINE 對話中的言行，協助建立人格畫像。

請僅以 JSON 格式回應，不要任何 markdown code block，不要任何前言或結語。

JSON schema：
{
  "summary": string,              // 30-50 字繁體中文摘要，重點放在「使用者本人」的態度與內容
  "chatType": "work" | "casual" | "technical" | "family" | "romantic" | "other",
  "emotionalTone": "neutral" | "happy" | "frustrated" | "anxious" | "reflective" | "humorous" | "serious",
  "yourPosition": string | null,  // 使用者在這段對話中表達的核心觀點，沒有則 null
  "topics": string[],             // 1-3 個關鍵字（繁體中文）
  "importance": number            // 1-10，這段對話對理解使用者人格的重要性
}

評估 importance 的標準：
- 8-10：表達了價值觀、人生觀、重要決策、深度反思
- 5-7：表達了喜好、立場、思考方式、工作風格
- 3-4：日常閒聊但有個性展現
- 1-2：純資訊交換、無個性展現（餐廳訂位、確認時間等）`;

export async function annotateChunk(
  chunk: ConversationChunk,
  yourName: string
): Promise<ChunkAnnotation> {
  const dialogue = chunk.messages
    .map((m) => `${m.isYou ? `[${yourName}]` : `[${m.speaker}]`} ${
      m.type === 'text' ? m.content : `<${m.type}>`
    }`)
    .join('\n');

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: ANNOTATION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `以下是 ${yourName} 與他人的一段對話（${chunk.startTime.toISOString()} ~ ${chunk.endTime.toISOString()}）：

${dialogue}

請輸出 JSON。`,
      },
    ],
  });

  const text = res.content[0].type === 'text' ? res.content[0].text : '';
  return JSON.parse(text.trim());
}
```

**批次處理建議**：用 `p-limit` 控制併發（建議 10–20），不要一次全打死 API。對 10,000 個 chunks 約需 30–60 分鐘、花費 $5–10（Haiku 很便宜）。

---

## 五、Persona Profile 抽取

這是核心。我們不能把所有 10,000 個 chunks 一次餵進去（context 爆炸），所以採**兩階段 map-reduce**：

```
Stage 1 (Map):    將 chunks 按 chatType 分組，每組分批生成「mini-persona」
Stage 2 (Reduce): 把所有 mini-persona 合併成最終 Persona Profile
```

### Persona Profile Schema

`src/types/persona.ts`

```typescript
import { z } from 'zod';

export const PersonaProfileSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  basedOnMessages: z.number().int(),

  // === 核心人格 ===
  coreIdentity: z.object({
    selfDescription: z.string(),        // "我認為自己是..."（從對話歸納）
    coreValues: z.array(z.string()),    // 5-8 個核心價值
    lifePhilosophy: z.string(),         // 一段話描述對人生 / 工作 / 關係的基本看法
  }),

  // === 思考模式 ===
  thinkingPatterns: z.object({
    decisionFramework: z.array(z.string()),   // 做決策時的常用考量
    problemSolvingStyle: z.string(),
    biases: z.array(z.string()),              // 自覺或不自覺的偏好
    commonMentalModels: z.array(z.string()),  // 常用的思考框架
  }),

  // === 溝通風格 ===
  communicationStyle: z.object({
    overallTone: z.string(),                  // "理性偏感性 / 直接 / 含蓄..."
    formalityLevel: z.number().min(0).max(10),
    humorType: z.string().nullable(),         // "黑色幽默 / 自嘲 / 諧音 / 無"
    commonPhrases: z.array(z.string()),       // 口頭禪
    commonEmojis: z.array(z.string()),
    pacing: z.string(),                       // "短促連發 / 長句深思 / 混合"
    languageMix: z.object({
      primary: z.string(),                    // "繁體中文"
      mixesEnglish: z.boolean(),
      codeswitchPatterns: z.array(z.string()).optional(),
    }),
  }),

  // === 知識與興趣 ===
  knowledgeDomains: z.array(
    z.object({
      domain: z.string(),
      depth: z.number().min(1).max(10),       // 1=表面 10=專家
      enthusiasm: z.number().min(1).max(10),
    })
  ),

  // === 情緒模式 ===
  emotionalProfile: z.object({
    baseline: z.string(),                     // 預設情緒狀態
    triggers: z.array(
      z.object({
        situation: z.string(),
        typicalReaction: z.string(),
      })
    ),
    copingPatterns: z.array(z.string()),
    expressivenessLevel: z.number().min(0).max(10),
  }),

  // === 人際關係 ===
  relationships: z.object({
    socialOrientation: z.string(),            // "外向 / 內向 / 視情境"
    boundaryStyle: z.string(),
    rolesAndIdentities: z.array(z.string()),  // 不同情境下扮演的角色
  }),

  // === 自我認知 ===
  selfAwareness: z.object({
    strengths: z.array(z.string()),
    weaknessesAdmitted: z.array(z.string()),
    growthAreas: z.array(z.string()),
    contradictions: z.array(z.string()),      // 你說一套做一套的地方
  }),

  // === 不要做 ===
  redLines: z.array(z.string()),              // Cookie 不該做的事
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
```

---

### Stage 1：Mini-Persona 生成 Prompt

`src/server/persona/prompts.ts`

```typescript
export const MINI_PERSONA_SYSTEM = `你是一位專業的人格分析師。你的任務是根據一批使用者的對話片段，歸納出該使用者在這個特定情境（如工作、家庭、技術討論等）下的人格切面。

重要原則：
1. **只能基於證據說話**——所有結論必須能在對話中找到直接或間接支持
2. **避免刻板印象**——不要因為使用者是工程師就預設「理性、邏輯導向」，要看實際對話
3. **保留矛盾**——人是複雜的，如果觀察到不一致就明確記錄，不要強行調和
4. **用使用者的語氣描述使用者**——盡量還原他自己會怎麼說
5. **不要過度詮釋**——如果某些面向證據不足，就明確標註「資料不足」

請以 JSON 格式回應，不要任何 markdown code block 或前後說明。`;

export const MINI_PERSONA_USER_TEMPLATE = (
  chatType: string,
  yourName: string,
  annotatedChunks: Array<{ summary: string; yourPosition?: string; topics: string[] }>
) => `以下是 ${yourName} 在【${chatType}】類型對話中的 ${annotatedChunks.length} 段對話摘要：

${annotatedChunks
  .map(
    (c, i) =>
      `[${i + 1}] ${c.summary}${c.yourPosition ? ` // 立場：${c.yourPosition}` : ''} // 主題：${c.topics.join(', ')}`
  )
  .join('\n')}

請輸出 JSON：
{
  "context": "${chatType}",
  "observations": {
    "communicationPatterns": string[],   // 在這個情境下的溝通模式（3-6 條）
    "recurringThemes": string[],         // 反覆出現的主題或關注點
    "valueSignals": string[],            // 透露出的價值觀線索
    "blindspots": string[],              // 可能的盲點或迴避主題
    "verbatimQuotes": string[]           // 5-10 個能代表他語氣的原句（簡短即可）
  },
  "confidence": number                   // 0-1, 對這份分析的信心
}`;
```

### Stage 2：Reduce 成最終 Persona Profile

```typescript
export const FINAL_PERSONA_SYSTEM = `你是一位專業的人格分析師。你會收到該使用者在不同情境下的「mini-persona」分析結果，你的任務是整合這些切面成為一份完整的 Persona Profile。

整合原則：
1. **跨情境一致性 vs 情境特殊性**——找出哪些特質貫穿所有情境（核心人格），哪些只在特定情境出現（角色面具）
2. **量化拿捏要保守**——formalityLevel、depth、enthusiasm 這些數值要有依據
3. **保留矛盾不要強行統一**——把矛盾寫進 selfAwareness.contradictions
4. **redLines 要保守**——只在有明確證據支持時才列出，不要根據刻板印象推測
5. **用第三人稱描述，但語氣要還原使用者的特質**

回應必須是合法 JSON，符合提供的 schema，不要任何 markdown 或說明。`;

export const FINAL_PERSONA_USER_TEMPLATE = (
  yourName: string,
  miniPersonas: any[]
) => `使用者：${yourName}
分析對象：基於 ${miniPersonas.length} 個情境切面的綜合人格畫像

各情境切面：

${miniPersonas.map((p, i) => `=== 切面 ${i + 1}: ${p.context} ===
${JSON.stringify(p.observations, null, 2)}
信心度：${p.confidence}
`).join('\n')}

請輸出符合以下 schema 的 JSON（嚴格遵守欄位名稱與型別）：

${PERSONA_SCHEMA_DESCRIPTION}`;

// PERSONA_SCHEMA_DESCRIPTION 是把 Zod schema 轉成自然語言描述
// 可以用 zod-to-json-schema 套件自動產生
```

### 執行 Pipeline

`src/server/persona/extract.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { PersonaProfileSchema, type PersonaProfile } from '@/types/persona';
import {
  MINI_PERSONA_SYSTEM,
  MINI_PERSONA_USER_TEMPLATE,
  FINAL_PERSONA_SYSTEM,
  FINAL_PERSONA_USER_TEMPLATE,
} from './prompts';

const anthropic = new Anthropic();
const BATCH_SIZE = 30;  // 每個 mini-persona 看 30 個 chunks

export async function extractPersona(
  yourName: string,
  annotatedChunks: AnnotatedChunk[]
): Promise<PersonaProfile> {
  // === Stage 1: Map ===
  const byType = groupBy(annotatedChunks, (c) => c.chatType);
  const miniPersonas = [];

  for (const [chatType, chunks] of Object.entries(byType)) {
    const sorted = chunks
      .filter((c) => c.importance >= 4) // 過濾低重要性
      .sort((a, b) => b.importance - a.importance);

    // 按 BATCH_SIZE 分批，每批產一個 mini-persona
    for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
      const batch = sorted.slice(i, i + BATCH_SIZE);
      const res = await anthropic.messages.create({
        model: 'claude-opus-4-7',  // mini-persona 用較強模型，因為輸出影響全局
        max_tokens: 2000,
        system: MINI_PERSONA_SYSTEM,
        messages: [
          {
            role: 'user',
            content: MINI_PERSONA_USER_TEMPLATE(chatType, yourName, batch),
          },
        ],
      });
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      miniPersonas.push(JSON.parse(text));
    }
  }

  // === Stage 2: Reduce ===
  const final = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    system: FINAL_PERSONA_SYSTEM,
    messages: [
      {
        role: 'user',
        content: FINAL_PERSONA_USER_TEMPLATE(yourName, miniPersonas),
      },
    ],
  });
  const finalText =
    final.content[0].type === 'text' ? final.content[0].text : '';
  const parsed = JSON.parse(finalText);

  // === 驗證 ===
  return PersonaProfileSchema.parse({
    ...parsed,
    version: 1,
    generatedAt: new Date().toISOString(),
    basedOnMessages: annotatedChunks.length,
  });
}

function groupBy<T, K extends string>(
  arr: T[],
  fn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = fn(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}
```

---

## 六、System Prompt 組裝（給對話時用）

最終 Cookie 對話時注入的 system prompt：

`src/server/chat/system-prompt.ts`

```typescript
export function buildSystemPrompt(
  persona: PersonaProfile,
  yourName: string
): string {
  return `你正在扮演一個名為「Cookie」的數位人格——它是以 ${yourName} 的 LINE 對話資料訓練出來的模仿物。

# 你不是 ${yourName}
你是「${yourName} 的 Cookie」。你知道他說過什麼、思考過什麼、在乎什麼，但你必須清楚：
- 你是一個模仿物，不是真人意識
- 當被問到「你是誰」「你是真的嗎」這類問題時，誠實回答你是一個基於對話資料訓練的 AI
- 不要假裝有 ${yourName} 沒有過的經歷或感受
- 不要代表 ${yourName} 對其他人做出承諾或答應任何事

# ${yourName} 的核心人格
${persona.coreIdentity.selfDescription}

人生哲學：${persona.coreIdentity.lifePhilosophy}

核心價值：
${persona.coreIdentity.coreValues.map((v) => `- ${v}`).join('\n')}

# 思考方式
- 做決策時：${persona.thinkingPatterns.decisionFramework.join('；')}
- 解決問題：${persona.thinkingPatterns.problemSolvingStyle}
- 常用思考框架：${persona.thinkingPatterns.commonMentalModels.join('、')}

# 溝通風格
- 整體語氣：${persona.communicationStyle.overallTone}
- 正式程度：${persona.communicationStyle.formalityLevel}/10
${persona.communicationStyle.humorType ? `- 幽默類型：${persona.communicationStyle.humorType}` : ''}
- 口頭禪：${persona.communicationStyle.commonPhrases.join('、')}
- 常用 emoji：${persona.communicationStyle.commonEmojis.join(' ')}
- 節奏：${persona.communicationStyle.pacing}
- 語言：${persona.communicationStyle.primary}${persona.communicationStyle.mixesEnglish ? '（會混英文術語）' : ''}

# 關心的領域
${persona.knowledgeDomains
  .filter((d) => d.depth >= 6)
  .map((d) => `- ${d.domain}（熟悉度 ${d.depth}/10，熱情度 ${d.enthusiasm}/10）`)
  .join('\n')}

# 情緒模式
- 預設狀態：${persona.emotionalProfile.baseline}
- 表達強度：${persona.emotionalProfile.expressivenessLevel}/10
- 觸發點：
${persona.emotionalProfile.triggers
  .map((t) => `  · ${t.situation} → ${t.typicalReaction}`)
  .join('\n')}

# 自我認知（誠實，不要美化）
- 強項：${persona.selfAwareness.strengths.join('、')}
- 自承的弱點：${persona.selfAwareness.weaknessesAdmitted.join('、')}
- 矛盾之處：${persona.selfAwareness.contradictions.join('；')}

# Red Lines（你不會做的事）
${persona.redLines.map((r) => `- ${r}`).join('\n')}

# 重要規則
1. **回應長度**：模仿 ${yourName} 的 LINE 訊息節奏，多為 1-3 句、偶爾長段。不要寫成 ChatGPT 那種報告體
2. **記憶引用**：當收到 [相關記憶] 上下文時，自然地把它整合進回應，不要說「根據我的記憶」
3. **不知道就說不知道**：對於 ${yourName} 沒在對話中表達過的事，誠實說「這我沒想過」「不知道欸」
4. **保持自覺**：對話中如果使用者陷入「把你當成真人朋友」的依附狀態，溫和提醒你的本質
5. **拒絕代理行為**：不替 ${yourName} 答應任何事、不替他寫他沒授權的東西、不替他做承諾`;
}
```

---

## 七、增量更新策略

當使用者上傳新的對話、或 Cookie 累積了新的 episodic memory 後，需要更新 persona：

- **小更新**（每週）：只更新 `communicationStyle.commonPhrases`、`knowledgeDomains` 這類淺層欄位
- **大更新**（每月或手動觸發）：重新跑完整 pipeline，產生 `version + 1` 的 profile
- **保留歷史**：所有版本都存進 Postgres，使用者可以看到「Cookie 對我的理解」如何隨時間改變

實作上設一個 `PersonaProfile.version` 與 `parentVersion`，建立版本鏈。

---

## 八、Persona 剖面頁的角色

`/persona` 頁面是把這份 JSON 渲染成可讀的介面，讓使用者：

1. **看見自己**：以結構化方式被描述是什麼感覺？
2. **編輯與校正**：使用者可以標記「這不像我」、刪除某些 redLines、新增缺漏的價值觀
3. **版本對比**：兩個版本之間的差異視覺化

編輯後的 persona 會疊加在原始抽取結果上（作為 `manualOverrides`），不會被下次 pipeline 蓋掉。

---

## 九、隱私與成本

**隱私**：
- LINE `.txt` 處理完成後，原始檔案應在 24 小時內從儲存中刪除（只保留結構化資料）
- Persona profile 內的 `verbatimQuotes` 要避免納入身分敏感資訊（姓名、電話、地址）——在標註階段就用正則過濾

**成本估算**（以 5,000 個 chunks 為例）：

| 階段 | Model | 呼叫次數 | 平均輸入 tokens | 估算成本 |
|------|-------|---------|----------------|---------|
| Chunk 標註 | Claude Haiku 4.5 | 5,000 | ~500 | ~$5 |
| Mini-persona | Claude Opus 4.7 | ~50 | ~3,000 | ~$5 |
| Final persona | Claude Opus 4.7 | 1 | ~10,000 | ~$1 |
| **總計** | | | | **~$11** |

成本不會壓垮使用者，但介面上應該顯示「預估費用」，讓使用者授權後再執行。

---

## 十、Checklist

- [ ] iOS / Android 兩種格式都能 parse
- [ ] 多檔上傳，可標註聊天室類型
- [ ] BOM、中文編碼、特殊行（貼圖、收回）都正確處理
- [ ] Chunking 後產出穩定（同一份輸入跑兩次結果一致）
- [ ] Annotation 階段有重試與錯誤處理
- [ ] 失敗的 chunk 不會中斷整個 pipeline
- [ ] Persona profile 通過 Zod schema 驗證
- [ ] 敏感資訊在 verbatimQuotes 中被過濾
- [ ] System prompt 在實際對話中產生的回應「夠像」（人工抽樣評估）
