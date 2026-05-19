import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { parseLineTxt } from '@/server/line-parser/parse';
import { chunkByTimeGap } from '@/server/line-parser/chunk';
import { persistChat } from '@/server/line-parser/persist';
import { getOrCreateActiveUser } from '@/server/user';
import { writeAudit } from '@/server/audit';
import type { IngestResponse } from '@/types/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FileMetaSchema = z.object({
  filename: z.string().min(1),
  chatRoom: z.string().min(1),
  chatType: z.enum(['private', 'group']),
  notes: z.string().optional(),
});

const PayloadSchema = z.object({
  selfName: z.string().min(1),
  files: z.array(FileMetaSchema).min(1),
});

/**
 * POST /api/ingest
 *
 * multipart/form-data:
 *   - meta: JSON string，符合 PayloadSchema（selfName + 每個檔案的 chatRoom/chatType/notes）
 *   - files: 一個或多個 .txt（順序與 meta.files 對齊）
 *
 * 整個流程是同步的：parse → chunk → 寫 DB → 寫 audit。
 * 對於 < 10 MB 的對話檔通常數秒內完成；更大的可在未來改成 queue + 背景 worker。
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const metaRaw = form.get('meta');
  if (typeof metaRaw !== 'string') {
    return NextResponse.json({ error: 'missing meta field' }, { status: 400 });
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(JSON.parse(metaRaw));
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid meta', detail: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length !== payload.files.length) {
    return NextResponse.json(
      { error: `file count mismatch: ${files.length} files, ${payload.files.length} meta entries` },
      { status: 400 }
    );
  }

  const user = await getOrCreateActiveUser({
    name: payload.selfName,
    displayName: payload.selfName,
  });

  const chats: IngestResponse['chats'] = [];
  let totalMessages = 0;
  let totalChunks = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = payload.files[i];
    const raw = await file.text();

    const messages = parseLineTxt(raw, {
      selfName: payload.selfName,
      chatRoom: meta.chatRoom,
    });
    const chunks = chunkByTimeGap(messages, { chatRoom: meta.chatRoom });

    const result = await persistChat({
      userId: user.id,
      filename: meta.filename,
      fileSize: file.size,
      chatRoom: meta.chatRoom,
      chatType: meta.chatType,
      notes: meta.notes,
      messages,
      chunks,
    });

    chats.push(result);
    totalMessages += result.messageCount;
    totalChunks += result.chunkCount;
  }

  await writeAudit(user.id, 'upload_chat', {
    chatCount: chats.length,
    totalMessages,
    totalChunks,
    rooms: chats.map((c) => c.chatRoom),
  });

  const response: IngestResponse = {
    userId: user.id,
    chats,
    totalMessages,
    totalChunks,
  };
  return NextResponse.json(response, { status: 201 });
}
