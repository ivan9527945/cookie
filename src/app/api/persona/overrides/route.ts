import { NextResponse, type NextRequest } from 'next/server';
import { getActiveUser } from '@/server/user';
import { setOverridesForActiveVersion } from '@/server/persona/update';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/persona/overrides — 取代目前 active version 的 manualOverrides。
 * Body：{ rejected: string[], additions: {...}, notes?: string }
 */
export async function PATCH(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  try {
    const state = await setOverridesForActiveVersion(user.id, payload);
    await writeAudit(user.id, 'edit_persona', {
      versionId: state.versionId,
      rejected: state.overrides.rejected.length,
    });
    return NextResponse.json({
      profile: state.merged,
      raw: state.raw,
      overrides: state.overrides,
      version: state.version,
      versionId: state.versionId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes('no active persona') ? 412 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
