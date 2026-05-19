import type { PersonaProfile } from '@/types/persona';
import {
  PersonaOverridesSchema,
  emptyOverrides,
  type OverridableArrayKey,
  type PersonaOverrides,
} from '@/types/persona-overrides';

/** 從 DB 原始 JSON 解析出 overrides；非法或缺欄就回空覆寫 */
export function parseOverrides(raw: unknown): PersonaOverrides {
  if (!raw) return emptyOverrides();
  const result = PersonaOverridesSchema.safeParse(raw);
  return result.success ? result.data : emptyOverrides();
}

/**
 * 套用 overrides 到 profile。回傳新的 profile 物件（不變更原物件）。
 *
 * - rejected: "section:value" 字串集合，過濾對應陣列項
 * - additions.section[]: 附加到對應陣列尾端
 */
export function applyOverrides(
  profile: PersonaProfile,
  overrides: PersonaOverrides
): PersonaProfile {
  const reject = new Set(overrides.rejected);

  const filter = (section: OverridableArrayKey, items: string[]) =>
    items.filter((v) => !reject.has(`${section}:${v}`));
  const append = (section: OverridableArrayKey, items: string[]) => [
    ...filter(section, items),
    ...overrides.additions[section],
  ];

  return {
    ...profile,
    coreIdentity: {
      ...profile.coreIdentity,
      coreValues: append('coreValues', profile.coreIdentity.coreValues),
    },
    communicationStyle: {
      ...profile.communicationStyle,
      commonPhrases: append(
        'commonPhrases',
        profile.communicationStyle.commonPhrases
      ),
    },
    relationships: {
      ...profile.relationships,
      rolesAndIdentities: append(
        'rolesAndIdentities',
        profile.relationships.rolesAndIdentities
      ),
    },
    selfAwareness: {
      ...profile.selfAwareness,
      strengths: append('strengths', profile.selfAwareness.strengths),
      weaknessesAdmitted: append(
        'weaknessesAdmitted',
        profile.selfAwareness.weaknessesAdmitted
      ),
    },
    redLines: append('redLines', profile.redLines),
  };
}
