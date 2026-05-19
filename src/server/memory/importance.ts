/**
 * 重要性評分 placeholder。實作待 episodic memory layer 落地後再補。
 * 目前先以 LLM 評分（在 episodic.ts 中直接由模型給）。
 */
export function decayImportance(
  original: number,
  ageHours: number,
  halfLifeHours = 24 * 30
): number {
  const ratio = 0.5 ** (ageHours / halfLifeHours);
  return Math.max(1, Math.round(original * ratio));
}
