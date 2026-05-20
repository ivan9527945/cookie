import { z } from 'zod';

/**
 * 使用者對 persona 的手動覆寫。應用 (apply) 時邏輯為：
 *   1. 把 rejected 內的「section:value」過濾掉
 *   2. 把 additions 內的陣列附加到對應欄位後面
 *   3. notes 保留作為使用者註記
 *
 * 維持簡單，刻意只支援陣列欄位的增刪。標量欄位（formalityLevel 等）
 * 由下次 pipeline 重新校正，不在此處覆寫。
 */
/**
 * T-106：矛盾條目的使用者標註——三種狀態
 *   - context-shift：「這是不同情境的我」（不是不誠實，是角色面具）
 *   - accepted：「我知道，這是我」（保留並擁有）
 *   - growth-target：「我想改變這個」（會進 system prompt 末段）
 */
export const ContradictionTagSchema = z.enum([
  'context-shift',
  'accepted',
  'growth-target',
]);
export type ContradictionTag = z.infer<typeof ContradictionTagSchema>;

export const PersonaOverridesSchema = z.object({
  rejected: z.array(z.string()).default([]),
  additions: z
    .object({
      coreValues: z.array(z.string()).default([]),
      redLines: z.array(z.string()).default([]),
      commonPhrases: z.array(z.string()).default([]),
      rolesAndIdentities: z.array(z.string()).default([]),
      strengths: z.array(z.string()).default([]),
      weaknessesAdmitted: z.array(z.string()).default([]),
    })
    .default({
      coreValues: [],
      redLines: [],
      commonPhrases: [],
      rolesAndIdentities: [],
      strengths: [],
      weaknessesAdmitted: [],
    }),
  /** Key 是矛盾陳述本身（contradictions string），value 是 tag */
  contradictionTags: z
    .record(z.string(), ContradictionTagSchema)
    .default({}),
  notes: z.string().optional(),
});

export type PersonaOverrides = z.infer<typeof PersonaOverridesSchema>;

export type OverridableArrayKey = keyof PersonaOverrides['additions'];

export function rejectionKey(section: OverridableArrayKey, value: string): string {
  return `${section}:${value}`;
}

export function emptyOverrides(): PersonaOverrides {
  return PersonaOverridesSchema.parse({});
}
