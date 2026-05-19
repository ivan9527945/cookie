import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/ingest — 接收 LINE .txt 上傳（multipart/form-data, field: "files"）
 *
 * TODO 實作：
 *   1. 驗證使用者 / 身份
 *   2. 讀取 file, 呼叫 parseLineTxt + chunkByTimeGap
 *   3. 寫入 UploadedChat / LineMessage / ConversationChunk
 *   4. 觸發 annotate + embed 的背景 job
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll('files');
  if (files.length === 0) {
    return NextResponse.json({ error: 'no files' }, { status: 400 });
  }
  return NextResponse.json(
    { accepted: files.length, status: 'queued' },
    { status: 202 }
  );
}
