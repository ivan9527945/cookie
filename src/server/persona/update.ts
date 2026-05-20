import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { PersonaProfile } from '@/types/persona';
import {
  PersonaOverridesSchema,
  type PersonaOverrides,
} from '@/types/persona-overrides';
import { applyOverrides, parseOverrides } from './overrides';

export interface PersonaState {
  /** 模型抽取出來的原始 profile，未套用使用者覆寫 */
  raw: PersonaProfile;
  /** 已套用 overrides 的可顯示版本 */
  merged: PersonaProfile;
  overrides: PersonaOverrides;
  version: number;
  versionId: string;
  generatedAt: Date;
}

/**
 * 給 LLM / system prompt 用：直接拿合併後（含 overrides）的 PersonaProfile。
 * Cookie 對話時要尊重使用者的手動修正，因此預設套 overrides。
 */
export async function getActivePersona(
  userId: string
): Promise<PersonaProfile | null> {
  const state = await getActivePersonaState(userId);
  return state?.merged ?? null;
}

/** 給編輯介面用：拿到 raw + overrides + merged + version meta */
export async function getActivePersonaState(
  userId: string
): Promise<PersonaState | null> {
  const row = await db.personaProfile.findFirst({
    where: { userId, isActive: true },
    orderBy: { version: 'desc' },
  });
  if (!row) return null;
  const raw = row.profile as unknown as PersonaProfile;
  const overrides = parseOverrides(row.manualOverrides);
  return {
    raw,
    merged: applyOverrides(raw, overrides),
    overrides,
    version: row.version,
    versionId: row.id,
    generatedAt: row.generatedAt,
  };
}

export interface VersionSliceFilter {
  from: string | null;
  to: string | null;
  chatRoomIds: string[] | null;
}

export interface VersionListItem {
  id: string;
  version: number;
  generatedAt: Date;
  basedOnMessages: number;
  isActive: boolean;
  generationModel: string | null;
  /** 若此版本是時間切片（T-110），帶出 filter 條件給 UI 標記 */
  sliceFilter: VersionSliceFilter | null;
}

/** 列出該 user 的所有 persona 版本，版本號降冪。 */
export async function listVersions(userId: string): Promise<VersionListItem[]> {
  const rows = await db.personaProfile.findMany({
    where: { userId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      generatedAt: true,
      basedOnMessages: true,
      isActive: true,
      generationModel: true,
      profile: true,
    },
  });
  return rows.map(({ profile, ...rest }) => {
    const sliceFilter =
      profile &&
      typeof profile === 'object' &&
      !Array.isArray(profile) &&
      'sliceFilter' in profile &&
      profile.sliceFilter
        ? (profile.sliceFilter as unknown as VersionSliceFilter)
        : null;
    return { ...rest, sliceFilter };
  });
}

/** 把某個 version 標為 active，其他 deactivate（單一 transaction）。 */
export async function activateVersion(
  userId: string,
  versionId: string
): Promise<void> {
  const target = await db.personaProfile.findFirst({
    where: { id: versionId, userId },
    select: { id: true },
  });
  if (!target) {
    throw new Error('version not found');
  }
  await db.$transaction([
    db.personaProfile.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    }),
    db.personaProfile.update({
      where: { id: target.id },
      data: { isActive: true },
    }),
  ]);
}

/**
 * 寫入新的 overrides 到目前 active version。
 * 傳入空物件等同清除覆寫。
 */
export async function setOverridesForActiveVersion(
  userId: string,
  incoming: unknown
): Promise<PersonaState> {
  const parsed = PersonaOverridesSchema.parse(incoming);
  const active = await db.personaProfile.findFirst({
    where: { userId, isActive: true },
    select: { id: true },
  });
  if (!active) {
    throw new Error('no active persona');
  }
  await db.personaProfile.update({
    where: { id: active.id },
    data: { manualOverrides: parsed as unknown as Prisma.InputJsonValue },
  });
  const refreshed = await getActivePersonaState(userId);
  if (!refreshed) throw new Error('failed to reload persona');
  return refreshed;
}
