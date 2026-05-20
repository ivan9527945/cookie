import { NextResponse, type NextRequest } from 'next/server';
import { getActiveUser } from '@/server/user';
import { retrieveMemories } from '@/server/memory/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/persona/evidence?q=...
 *
 * 給 persona 條目找「為什麼會這樣說」的支撐 chunks。
 *
 * 設計選擇（T-109 輕版）：重用既有 retrieveMemories（已存在的 Qdrant semantic
 * search），不額外做 prompt-level 引用機制。優點：零模型開銷、不需要重生 persona、
 * 不會「引用錯導致更不信」。代價：證據是「相似」而非「歸納依據」，使用者要自己判斷。
 */
export async function GET(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ chunks: [] });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json(
      { error: 'q parameter required' },
      { status: 400 }
    );
  }

  const result = await retrieveMemories(q, user.id, {
    chunkLimit: 5,
    episodeLimit: 0,
    minImportance: 3,
  });

  return NextResponse.json({ chunks: result.chunks });
}
