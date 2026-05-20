import { randomUUID } from 'crypto';
import { anthropic, MODELS, anthropicUserMeta } from '@/lib/anthropic';
import { qdrant, COLLECTIONS } from '@/lib/qdrant';
import { embed } from '@/lib/embedding';
import { db } from '@/lib/db';
import type { ExtractedEpisode } from '@/types/memory';
import type { ChatTurn } from '@/types/chat';

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
  "summary": string,
  "importance": number,
  "emotionalValence": number
}

若沒有值得記住的內容，輸出 []`;

const MIN_IMPORTANCE = 4;

export async function extractEpisodes(
  sessionId: string,
  userId: string,
  recentTurns: ChatTurn[]
): Promise<number> {
  const dialogue = recentTurns
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n');

  const res = await anthropic.messages.create({
    model: MODELS.light,
    max_tokens: 800,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: dialogue }],
    metadata: anthropicUserMeta(userId),
  });

  const text = res.content[0].type === 'text' ? res.content[0].text : '[]';
  const episodes: ExtractedEpisode[] = JSON.parse(text);

  let written = 0;
  for (const ep of episodes) {
    if (ep.importance < MIN_IMPORTANCE) continue;
    const id = randomUUID();
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

    await qdrant.upsert(COLLECTIONS.episodes, {
      points: [
        {
          id,
          vector,
          payload: {
            userId,
            sessionId,
            summary: ep.summary,
            importance: ep.importance,
            emotionalValence: ep.emotionalValence,
            createdAt: new Date().toISOString(),
          },
        },
      ],
    });
    written += 1;
  }

  return written;
}
