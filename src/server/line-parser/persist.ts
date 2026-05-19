import { db } from '@/lib/db';
import type { ChatType, MessageType, Prisma } from '@prisma/client';
import type { ConversationChunk, LineMessage } from '@/types/line';

const INSERT_BATCH = 1000;

export interface PersistChatInput {
  userId: string;
  filename: string;
  fileSize: number;
  chatRoom: string;
  chatType: ChatType;
  notes?: string;
  messages: LineMessage[];
  chunks: ConversationChunk[];
}

export interface PersistChatResult {
  uploadedChatId: string;
  chatRoom: string;
  messageCount: number;
  chunkCount: number;
}

/**
 * 把單一 LINE 對話寫進 DB：
 *   1. UploadedChat
 *   2. ConversationChunk × N（createManyAndReturn 取回 ids）
 *   3. LineMessage × M（含 chunkId 回填；落在所有 chunk 之外的訊息 chunkId=null）
 *   4. UploadedChat.messageCount 更新成實際寫入數
 */
export async function persistChat(
  input: PersistChatInput
): Promise<PersistChatResult> {
  const uploadedChat = await db.uploadedChat.create({
    data: {
      userId: input.userId,
      chatRoom: input.chatRoom,
      chatType: input.chatType,
      filename: input.filename,
      fileSize: input.fileSize,
      messageCount: 0,
      notes: input.notes,
    },
    select: { id: true },
  });

  const chunkRows =
    input.chunks.length === 0
      ? []
      : await db.conversationChunk.createManyAndReturn({
          data: input.chunks.map((c) => ({
            uploadedChatId: uploadedChat.id,
            startTime: c.startTime,
            endTime: c.endTime,
            participants: c.participants,
            messageCount: c.messages.length,
            yourMessageCount: c.yourMessages.length,
          })),
          select: { id: true },
        });

  const chunkedMessages = new Set<LineMessage>();
  const messageRows: Prisma.LineMessageCreateManyInput[] = [];

  for (let i = 0; i < input.chunks.length; i++) {
    const chunk = input.chunks[i];
    const chunkId = chunkRows[i].id;
    for (const m of chunk.messages) {
      chunkedMessages.add(m);
      messageRows.push({
        uploadedChatId: uploadedChat.id,
        timestamp: m.timestamp,
        speaker: m.speaker,
        isYou: m.isYou,
        type: m.type as MessageType,
        content: m.content,
        chunkId,
      });
    }
  }

  for (const m of input.messages) {
    if (chunkedMessages.has(m)) continue;
    messageRows.push({
      uploadedChatId: uploadedChat.id,
      timestamp: m.timestamp,
      speaker: m.speaker,
      isYou: m.isYou,
      type: m.type as MessageType,
      content: m.content,
      chunkId: null,
    });
  }

  for (let i = 0; i < messageRows.length; i += INSERT_BATCH) {
    await db.lineMessage.createMany({
      data: messageRows.slice(i, i + INSERT_BATCH),
    });
  }

  await db.uploadedChat.update({
    where: { id: uploadedChat.id },
    data: { messageCount: messageRows.length },
  });

  return {
    uploadedChatId: uploadedChat.id,
    chatRoom: input.chatRoom,
    messageCount: messageRows.length,
    chunkCount: chunkRows.length,
  };
}
