import { NextResponse, type NextRequest } from 'next/server';
import { extractFileMetadata } from '@/server/line-parser/metadata';
import type { FilePreview } from '@/types/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/preview — 接收 .txt，回傳 per-file metadata（不寫 DB）。
 * 讓前端在正式 ingest 前可以給使用者確認 chatRoom / chatType / selfName。
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const entries = form.getAll('files');
  const files = entries.filter((e): e is File => e instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: 'no files' }, { status: 400 });
  }

  const previews: FilePreview[] = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      const meta = extractFileMetadata(text);
      return {
        filename: file.name,
        fileSize: file.size,
        chatRoom: meta.chatRoom ?? file.name.replace(/\.txt$/i, ''),
        detectedType: meta.detectedType,
        speakers: meta.speakers,
        messageCount: meta.messageCount,
        startTime: meta.startTime?.toISOString() ?? null,
        endTime: meta.endTime?.toISOString() ?? null,
      };
    })
  );

  return NextResponse.json({ files: previews });
}
