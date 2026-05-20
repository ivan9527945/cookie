/**
 * 迴避主題偵測（Avoidance Patterns）— T-111
 *
 * 設計：
 *   - 從已標註的 chunks 收集所有 topics（去重）
 *   - 對每個 topic，掃 LineMessage：自己（isYou=true）vs 他人 提及次數
 *   - 「迴避指數 = other / (self + 1)」愈大愈像是被別人提起、自己不接話的主題
 *   - 過濾噪音：topic 太短（< 2 字）或太常出現於兩邊都接近的略過
 *
 * 為什麼這設計而不是模型判斷：
 *   - 統計可重現、可驗證、便宜
 *   - 模型判斷 avoidance 容易過度詮釋
 */
import { db } from '@/lib/db';

export interface AvoidanceTopic {
  topic: string;
  selfMentions: number;
  otherMentions: number;
  /** other / (self + 1) — 愈高愈像迴避 */
  avoidanceScore: number;
}

export interface AvoidanceResult {
  /** 至少要有這麼多 chunk 用過此 topic 才納入分析（避免 long-tail 雜訊） */
  minChunkOccurrence: number;
  topics: AvoidanceTopic[];
}

const MIN_CHUNK_OCCURRENCE = 2;
const MIN_TOTAL_MENTIONS = 3;
const MIN_AVOIDANCE_SCORE = 1.5;

export async function computeAvoidance(
  userId: string
): Promise<AvoidanceResult | null> {
  // 1. 收集所有 topics 與 chunk count（過濾 long-tail）
  const chunks = await db.conversationChunk.findMany({
    where: {
      uploadedChat: { userId },
      annotatedAt: { not: null },
    },
    select: { topics: true },
  });

  if (chunks.length === 0) return null;

  const topicChunkCount = new Map<string, number>();
  for (const c of chunks) {
    for (const t of c.topics) {
      const norm = t.trim();
      if (!norm || norm.length < 2) continue;
      topicChunkCount.set(norm, (topicChunkCount.get(norm) ?? 0) + 1);
    }
  }

  const candidateTopics = Array.from(topicChunkCount.entries())
    .filter(([, count]) => count >= MIN_CHUNK_OCCURRENCE)
    .map(([topic]) => topic);

  if (candidateTopics.length === 0) {
    return { minChunkOccurrence: MIN_CHUNK_OCCURRENCE, topics: [] };
  }

  // 2. 拉所有 text messages，分自己 vs 他人
  const messages = await db.lineMessage.findMany({
    where: {
      uploadedChat: { userId },
      type: 'text',
    },
    select: { content: true, isYou: true },
  });

  // 3. 對每個 candidate topic 累計 mention 次數
  const stats = new Map<string, { self: number; other: number }>();
  for (const t of candidateTopics) stats.set(t, { self: 0, other: 0 });

  for (const m of messages) {
    for (const topic of candidateTopics) {
      if (m.content.includes(topic)) {
        const s = stats.get(topic);
        if (!s) continue;
        if (m.isYou) s.self += 1;
        else s.other += 1;
      }
    }
  }

  // 4. 過濾 + 排序
  const topics: AvoidanceTopic[] = [];
  for (const [topic, s] of stats.entries()) {
    const total = s.self + s.other;
    if (total < MIN_TOTAL_MENTIONS) continue;
    const score = s.other / (s.self + 1);
    if (score < MIN_AVOIDANCE_SCORE) continue;
    topics.push({
      topic,
      selfMentions: s.self,
      otherMentions: s.other,
      avoidanceScore: score,
    });
  }

  topics.sort((a, b) => b.avoidanceScore - a.avoidanceScore);

  return {
    minChunkOccurrence: MIN_CHUNK_OCCURRENCE,
    topics: topics.slice(0, 12),
  };
}
