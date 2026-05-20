import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getActiveUser } from '@/server/user';
import { runPersonaPipeline } from '@/server/persona/generate';
import { isRunning, setStatus, getStatus } from '@/server/persona/status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SliceRequestSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  chatRoomIds: z.array(z.string().uuid()).optional(),
});

/**
 * POST /api/persona/slice — 用 filter 跑一個切片 persona（T-110）
 *
 * Body: { from?: ISO, to?: ISO, chatRoomIds?: uuid[] }
 *
 * 切片不會啟用、也不會 deactivate active version——純觀察用。
 * 完成後使用者可以從 persona 頁的版本下拉切過去看，或主動 activate 它。
 */
export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: 'no active user' }, { status: 401 });
  }

  if (isRunning(user.id)) {
    return NextResponse.json(
      { error: 'pipeline already running', status: getStatus(user.id) },
      { status: 409 }
    );
  }

  let parsed: z.infer<typeof SliceRequestSchema>;
  try {
    parsed = SliceRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!parsed.from && !parsed.to && !parsed.chatRoomIds?.length) {
    return NextResponse.json(
      { error: 'must specify at least one of from / to / chatRoomIds' },
      { status: 400 }
    );
  }

  const filter = {
    from: parsed.from ? new Date(parsed.from) : undefined,
    to: parsed.to ? new Date(parsed.to) : undefined,
    chatRoomIds: parsed.chatRoomIds,
  };

  setStatus(user.id, {
    state: 'annotating',
    startedAt: new Date().toISOString(),
  });

  setImmediate(() => {
    runPersonaPipeline(user.id, user.name, {
      filter,
      asSlice: true,
    }).catch((err) => {
      console.error('[persona-slice] pipeline failed', err);
      setStatus(user.id, {
        state: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    });
  });

  return NextResponse.json(
    { status: 'started', userId: user.id, slice: true },
    { status: 202 }
  );
}
