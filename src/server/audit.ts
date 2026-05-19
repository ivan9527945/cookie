import { Prisma } from '@prisma/client';
import type { AuditAction } from '@prisma/client';
import { db } from '@/lib/db';

/** 寫一筆 audit log。為了避免擋住主流程，失敗不會 throw，只 console.warn。 */
export async function writeAudit(
  userId: string,
  action: AuditAction,
  details?: Prisma.InputJsonValue
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        details: details ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.warn('[audit] failed to write log', { userId, action, err });
  }
}
