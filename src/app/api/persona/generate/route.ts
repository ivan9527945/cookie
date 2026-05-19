import { NextResponse } from 'next/server';
import { getActiveUser } from '@/server/user';
import { runPersonaPipeline } from '@/server/persona/generate';
import { isRunning, setStatus, getStatus } from '@/server/persona/status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/persona/generate — 觸發 persona 抽取 pipeline（fire-and-forget）
 *
 * 開發環境下用 setImmediate 在同一個 process 跑 pipeline（Node long-running）。
 * Production 部署到 serverless 平台前要改成 BullMQ + Redis 才不會被 cold-start 殺掉。
 *
 * 回應立刻 202；UI 透過 /api/persona/status 輪詢進度。
 */
export async function POST() {
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

  setStatus(user.id, { state: 'annotating', startedAt: new Date().toISOString() });

  setImmediate(() => {
    runPersonaPipeline(user.id, user.name).catch((err) => {
      console.error('[persona] pipeline failed', err);
      setStatus(user.id, {
        state: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    });
  });

  return NextResponse.json(
    { status: 'started', userId: user.id },
    { status: 202 }
  );
}
