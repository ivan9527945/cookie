/**
 * 語言指紋（Conversational Footprint）— T-108
 *
 * 純統計，不靠 LLM。對 LineMessage 中 isYou=true 的文字訊息做：
 *   - 平均句長 + 句長分佈
 *   - top n-gram（純 CJK 2/3-char）作為「常用語」
 *   - 絕對化用語頻率
 *   - code-switching：英文 token 比例
 *
 * 在 GET /api/persona/footprint 即時跑——對幾萬筆訊息夠快，
 * 之後若需要可以快取進 PersonaProfile.profile.footprint。
 */
import { db } from '@/lib/db';

const ABSOLUTE_WORDS = [
  '總是',
  '從不',
  '從來不',
  '一定',
  '絕對',
  '永遠',
  '必須',
  '不可能',
  '完全',
  '一直都',
];

const CJK_CHAR = /[一-鿿]/;
const ENGLISH_TOKEN = /[A-Za-z]{2,}/g;
const TERMINAL_PUNCT = /[。！？!?\n]+/;

export interface Footprint {
  totalMessages: number;
  totalSentences: number;

  /** 平均句長（不含標點、不含空白；CJK 算一字、英文 token 算一字） */
  avgSentenceLength: number;
  /** 句長分佈：0-5 / 6-10 / 11-20 / 21-40 / 40+ */
  sentenceLengthHistogram: { range: string; count: number }[];
  /** 華語常模做參照（從 docs/05 §五-1 範例引用） */
  chineseNormAvgSentenceLength: number;

  /** 出現次數最高的 2-3 字 CJK 短語 */
  topPhrases: { phrase: string; count: number }[];

  /** 絕對化用語頻率（總是 / 從不 / 一定 / 絕對 …） */
  absoluteWords: { word: string; count: number }[];
  absoluteWordsTotal: number;
  /** 平均每千字出現幾次絕對化用語（供使用者比對） */
  absoluteWordsPerThousand: number;

  /** Code-switching：英文 token / (CJK + 英文 token) */
  englishTokenRatio: number;
  englishTokenCount: number;
}

const CHINESE_NORM_AVG_SENTENCE_LENGTH = 18.7;

/** 計算使用者的語言指紋；沒有任何 LINE 訊息時回 null */
export async function computeFootprint(
  userId: string
): Promise<Footprint | null> {
  const messages = await db.lineMessage.findMany({
    where: {
      uploadedChat: { userId },
      isYou: true,
      type: 'text',
    },
    select: { content: true },
  });

  if (messages.length === 0) return null;

  // ---- 切句 ----
  const sentences: string[] = [];
  for (const m of messages) {
    for (const s of m.content.split(TERMINAL_PUNCT)) {
      const trimmed = s.trim();
      if (trimmed) sentences.push(trimmed);
    }
  }

  // ---- 句長 ----
  const sentenceLengths = sentences.map(countTokens);
  const totalTokens = sentenceLengths.reduce((a, b) => a + b, 0);
  const avgSentenceLength =
    sentenceLengths.length > 0 ? totalTokens / sentenceLengths.length : 0;

  const bins = [
    { range: '0–5', max: 5 },
    { range: '6–10', max: 10 },
    { range: '11–20', max: 20 },
    { range: '21–40', max: 40 },
    { range: '40+', max: Infinity },
  ];
  const histogram = bins.map((b) => ({ range: b.range, count: 0 }));
  for (const len of sentenceLengths) {
    const idx = bins.findIndex((b) => len <= b.max);
    if (idx >= 0) histogram[idx].count += 1;
  }

  // ---- N-gram ----
  const ngramCounts = new Map<string, number>();
  for (const m of messages) {
    addNgrams(m.content, 2, ngramCounts);
    addNgrams(m.content, 3, ngramCounts);
  }
  const topPhrases = Array.from(ngramCounts.entries())
    .filter(([phrase, count]) => count >= 3 && !isLowSignal(phrase))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([phrase, count]) => ({ phrase, count }));

  // ---- 絕對化用語 ----
  const absoluteCounts = ABSOLUTE_WORDS.map((word) => {
    let count = 0;
    for (const m of messages) {
      const matches = m.content.split(word).length - 1;
      count += matches;
    }
    return { word, count };
  })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const absoluteTotal = absoluteCounts.reduce((a, b) => a + b.count, 0);
  const absoluteWordsPerThousand =
    totalTokens > 0 ? (absoluteTotal / totalTokens) * 1000 : 0;

  // ---- Code-switching ----
  let englishTokenCount = 0;
  let cjkCharCount = 0;
  for (const m of messages) {
    const englishMatches = m.content.match(ENGLISH_TOKEN);
    if (englishMatches) englishTokenCount += englishMatches.length;
    for (const ch of m.content) {
      if (CJK_CHAR.test(ch)) cjkCharCount += 1;
    }
  }
  const denominator = englishTokenCount + cjkCharCount;
  const englishTokenRatio =
    denominator > 0 ? englishTokenCount / denominator : 0;

  return {
    totalMessages: messages.length,
    totalSentences: sentences.length,
    avgSentenceLength,
    sentenceLengthHistogram: histogram,
    chineseNormAvgSentenceLength: CHINESE_NORM_AVG_SENTENCE_LENGTH,
    topPhrases,
    absoluteWords: absoluteCounts,
    absoluteWordsTotal: absoluteTotal,
    absoluteWordsPerThousand,
    englishTokenRatio,
    englishTokenCount,
  };
}

/** 計 token：CJK 一字一 token，英文 token 整段算一 token，其他略過 */
function countTokens(s: string): number {
  let count = 0;
  for (const ch of s) {
    if (CJK_CHAR.test(ch)) count += 1;
  }
  const englishMatches = s.match(ENGLISH_TOKEN);
  if (englishMatches) count += englishMatches.length;
  return count;
}

/** 對一段文字產 n-gram（純 CJK 連續 n 字），累加進 counts */
function addNgrams(text: string, n: number, counts: Map<string, number>): void {
  // 把非 CJK 切斷，避免「我是A」被當成 3-gram
  const chunks = text.split(/[^一-鿿]+/);
  for (const chunk of chunks) {
    if (chunk.length < n) continue;
    for (let i = 0; i <= chunk.length - n; i++) {
      const gram = chunk.slice(i, i + n);
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
  }
}

/** 過濾掉低訊號的短語：單字重複（嗯嗯、哈哈）以及純語助詞拼接 */
function isLowSignal(phrase: string): boolean {
  // 全部字一樣（嗯嗯、哈哈、嘿嘿）— 訊號低
  const allSame = [...phrase].every((c) => c === phrase[0]);
  if (allSame) return true;
  // 純語助詞拼接：的的、了了、嗎嗎 之類已被 allSame 蓋掉，這裡再過幾個常見高頻但低訊號
  if (/^(的|了|嗎|呢|啦|喔|耶|阿|啊|嗯|哈)+$/.test(phrase)) return true;
  return false;
}
