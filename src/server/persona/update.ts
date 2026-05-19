import { db } from '@/lib/db';
import type { PersonaProfile } from '@/types/persona';

export async function activatePersonaVersion(
  userId: string,
  versionId: string
) {
  await db.$transaction([
    db.personaProfile.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    }),
    db.personaProfile.update({
      where: { id: versionId },
      data: { isActive: true },
    }),
  ]);
}

export async function getActivePersona(
  userId: string
): Promise<PersonaProfile | null> {
  const row = await db.personaProfile.findFirst({
    where: { userId, isActive: true },
  });
  return row ? (row.profile as unknown as PersonaProfile) : null;
}
