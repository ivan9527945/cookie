/**
 * LINE parser 抽樣驗證 script。
 *
 *   pnpm tsx scripts/test-parse.ts            # 跑內建 fixtures
 *   pnpm tsx scripts/test-parse.ts <file>     # 跑使用者提供的 .txt（不寫 DB）
 *
 * 用途：T-008 驗證 iOS / Android 全/半形括號、UTF-8 BOM、多行訊息、特殊 token
 * 在 parse.ts / metadata.ts 都能正確走通。
 */

import { readFile } from 'node:fs/promises';
import { parseLineTxt } from '../src/server/line-parser/parse';
import { chunkByTimeGap } from '../src/server/line-parser/chunk';
import { extractFileMetadata } from '../src/server/line-parser/metadata';

interface Fixture {
  name: string;
  selfName: string;
  raw: string;
  expect: {
    chatRoom?: string | null;
    detectedType?: 'private' | 'group';
    messageCountAtLeast?: number;
    speakerCount?: number;
    /** 至少要有這幾種 message type 出現過 */
    seenTypes?: Array<
      'text' | 'sticker' | 'image' | 'video' | 'file' | 'voice' | 'url' | 'system'
    >;
  };
}

const BOM = '﻿';

const FIXTURES: Fixture[] = [
  {
    name: 'iOS 半形括號 + BOM + 多行訊息',
    selfName: 'Satoshi',
    raw:
      BOM +
      `[LINE] 與 小明 的聊天紀錄
儲存日期：2025/03/15 14:23

2024/01/05(週一)
14:23\tSatoshi\t今天 PR review 真的有夠累
14:25\t小明\t辛苦了 RxJS 那段我看不懂
14:26\tSatoshi\t哈哈我等等錄個影片解釋
這是第二行
14:30\tSatoshi\t[貼圖]
14:32\tSatoshi\thttps://example.com/post
14:35\t小明\t謝謝！
14:40\tSatoshi\t[照片]
14:50\t小明\t已收回訊息
`,
    expect: {
      chatRoom: '小明',
      detectedType: 'private',
      messageCountAtLeast: 8,
      speakerCount: 2,
      seenTypes: ['text', 'sticker', 'image', 'url', 'system'],
    },
  },
  {
    name: 'Android 全形括號 + - 分隔日期',
    selfName: 'Satoshi',
    raw: `[LINE] 與 開發小組 的聊天紀錄
儲存日期：2025/03/15 14:23

2024-01-05（週一）
09:00\tSatoshi\t早安
09:01\t阿凱\t早
09:02\t小芸\t今天 standup 改 10 點
09:05\tSatoshi\t收到
2024-01-06（週二）
10:00\tSatoshi\t[語音訊息]
10:01\t阿凱\t☎ 通話時間 00:05:23
10:05\t小芸\t[檔案]
`,
    expect: {
      chatRoom: '開發小組',
      detectedType: 'group',
      messageCountAtLeast: 7,
      speakerCount: 3,
      seenTypes: ['text', 'voice', 'system', 'file'],
    },
  },
  {
    name: 'Android 英文星期 (Mon)',
    selfName: 'Satoshi',
    raw: `[LINE] 與 Alice 的聊天紀錄

2024/02/10(Mon)
08:30\tSatoshi\tmorning
08:31\tAlice\thi
08:32\tSatoshi\twhat's the plan today?
08:33\tAlice\tlet's meet at 3
`,
    expect: {
      chatRoom: 'Alice',
      detectedType: 'private',
      messageCountAtLeast: 4,
      speakerCount: 2,
      seenTypes: ['text'],
    },
  },
  {
    name: '[影片] 與 [檔案] 標記',
    selfName: 'Satoshi',
    raw: `[LINE] 與 媽 的聊天紀錄

2024/05/01(週三)
20:00\t媽\t[影片]
20:01\tSatoshi\t收到
20:02\t媽\t[檔案]
20:03\tSatoshi\t謝啦
`,
    expect: {
      chatRoom: '媽',
      detectedType: 'private',
      messageCountAtLeast: 4,
      speakerCount: 2,
      seenTypes: ['text', 'video', 'file'],
    },
  },
];

interface Result {
  fixture: string;
  ok: boolean;
  failures: string[];
}

function runFixture(f: Fixture): Result {
  const failures: string[] = [];
  const meta = extractFileMetadata(f.raw);
  const messages = parseLineTxt(f.raw, {
    selfName: f.selfName,
    chatRoom: meta.chatRoom ?? '?',
  });
  const chunks = chunkByTimeGap(messages, {
    chatRoom: meta.chatRoom ?? '?',
    minMessages: 1,
    minYourMessages: 0,
  });

  if (
    f.expect.chatRoom !== undefined &&
    meta.chatRoom !== f.expect.chatRoom
  ) {
    failures.push(
      `chatRoom: expected ${JSON.stringify(f.expect.chatRoom)}, got ${JSON.stringify(meta.chatRoom)}`
    );
  }
  if (
    f.expect.detectedType !== undefined &&
    meta.detectedType !== f.expect.detectedType
  ) {
    failures.push(
      `detectedType: expected ${f.expect.detectedType}, got ${meta.detectedType}`
    );
  }
  if (
    f.expect.messageCountAtLeast !== undefined &&
    messages.length < f.expect.messageCountAtLeast
  ) {
    failures.push(
      `messages: expected >= ${f.expect.messageCountAtLeast}, got ${messages.length}`
    );
  }
  if (
    f.expect.speakerCount !== undefined &&
    meta.speakers.length !== f.expect.speakerCount
  ) {
    failures.push(
      `speakers: expected ${f.expect.speakerCount}, got ${meta.speakers.length} (${meta.speakers.map((s) => s.name).join(', ')})`
    );
  }
  if (f.expect.seenTypes) {
    const got = new Set(messages.map((m) => m.type));
    for (const want of f.expect.seenTypes) {
      if (!got.has(want)) {
        failures.push(`type "${want}" not seen (got: ${[...got].join(', ')})`);
      }
    }
  }

  // 額外健康檢查：chunk pipeline 不該 crash
  if (chunks.length === 0 && messages.length > 0) {
    failures.push(`chunkByTimeGap produced 0 chunks for ${messages.length} messages`);
  }

  return { fixture: f.name, ok: failures.length === 0, failures };
}

async function runFile(path: string): Promise<void> {
  const raw = await readFile(path, 'utf-8');
  const meta = extractFileMetadata(raw);
  console.log(`\n=== ${path} ===`);
  console.log(`chatRoom: ${meta.chatRoom}`);
  console.log(`detectedType: ${meta.detectedType}`);
  console.log(`messageCount: ${meta.messageCount}`);
  console.log(`speakers (top 5):`);
  for (const s of meta.speakers.slice(0, 5)) {
    console.log(`  ${s.name.padEnd(20)} ${s.messageCount}`);
  }
  console.log(
    `time range: ${meta.startTime?.toISOString() ?? '?'} → ${meta.endTime?.toISOString() ?? '?'}`
  );

  const selfName = meta.speakers[0]?.name ?? '?';
  const messages = parseLineTxt(raw, {
    selfName,
    chatRoom: meta.chatRoom ?? '?',
  });
  const chunks = chunkByTimeGap(messages, {
    chatRoom: meta.chatRoom ?? '?',
  });
  console.log(`parsed messages: ${messages.length}`);
  console.log(`chunks (default options): ${chunks.length}`);
}

async function main() {
  const fileArg = process.argv[2];
  if (fileArg) {
    await runFile(fileArg);
    return;
  }

  const results = FIXTURES.map(runFixture);
  let passed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`✓ ${r.fixture}`);
      passed += 1;
    } else {
      console.log(`✗ ${r.fixture}`);
      for (const f of r.failures) console.log(`    ${f}`);
    }
  }
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
