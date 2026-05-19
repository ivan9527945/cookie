import { anthropic, MODELS } from '@/lib/anthropic';
import type { ChunkAnnotation, ConversationChunk } from '@/types/line';

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

/** Claude 偶爾還是會包 ```json ... ``` 進來，先剝乾淨 */
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function callAnnotate(
  dialogue: string,
  yourName: string,
  start: Date,
  end: Date
): Promise<ChunkAnnotation> {
  const res = await anthropic.messages.create({
    model: MODELS.light,
    max_tokens: 500,
    system: ANNOTATION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `以下是 ${yourName} 與他人的一段對話（${start.toISOString()} ~ ${end.toISOString()}）：

${dialogue}

請輸出 JSON。`,
      },
    ],
  });

  const raw = res.content[0].type === 'text' ? res.content[0].text : '';
  const parsed = JSON.parse(stripFences(raw)) as ChunkAnnotation & {
    yourPosition: string | null;
  };
  return {
    ...parsed,
    yourPosition: parsed.yourPosition ?? undefined,
  };
}

export async function annotateChunk(
  chunk: ConversationChunk,
  yourName: string,
  options: { maxRetries?: number } = {}
): Promise<ChunkAnnotation> {
  const { maxRetries = 3 } = options;
  const dialogue = chunk.messages
    .map(
      (m) =>
        `${m.isYou ? `[${yourName}]` : `[${m.speaker}]`} ${
          m.type === 'text' ? m.content : `<${m.type}>`
        }`
    )
    .join('\n');

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callAnnotate(
        dialogue,
        yourName,
        chunk.startTime,
        chunk.endTime
      );
    } catch (err) {
      lastErr = err;
      const delay = 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`annotateChunk failed after ${maxRetries} attempts`);
}
