import { NextResponse, type NextRequest } from 'next/server';
import { getActiveUser } from '@/server/user';
import { activateVersion } from '@/server/persona/update';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/persona/activate — body: { versionId } — 將指定版本設為 active */
export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  let body: { versionId?: string };
  try {
    body = (await req.json()) as { versionId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId required' }, { status: 400 });
  }

  try {
    await activateVersion(user.id, body.versionId);
    await writeAudit(user.id, 'edit_persona', {
      action: 'activate',
      versionId: body.versionId,
    });
    return NextResponse.json({ ok: true, versionId: body.versionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
