import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveUser } from '@/server/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/chats — 列出該使用者已上傳的所有 LINE 聊天室
 * （給 T-110 切片 UI 用：「只生成這幾個聊天室的我」）
 */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ chats: [] });
  const chats = await db.uploadedChat.findMany({
    where: { userId: user.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      chatRoom: true,
      chatType: true,
      messageCount: true,
    },
  });
  return NextResponse.json({ chats });
}
