# 文檔 ↔ 實作落差評估與 TODO

> 審查日期：2026-05-19
> 對照範圍：`docs/00–04` × `src/`、`prisma/`、`scripts/`、`docker-compose.yml`、`next.config.ts`、`package.json`
>
> 結論：核心 pipeline（LINE parse → chunk → annotate → mini-persona → final persona → embed → retrieve → chat）與資料層 schema 完全對齊文檔。落差主要集中在 **(a) 隱私承諾的兌現**、**(b) 文檔目錄樹未反映 Week 4–6 演進**、**(c) 幾個未使用的占位資源**。

---

## 一、評估維度

每一項落差以三個維度評估：

| 維度 | 說明 |
|---|---|
| **必要性** | 是否影響功能正確性 / 隱私承諾 / 安全性 |
| **成本** | 實作所需工時與風險 |
| **優先序** | P0 = 立刻做；P1 = 本週內；P2 = 有空再做；P3 = 看情況 |

---

## 二、TODO 清單

### P0 — 需要立刻處理（隱私承諾 / 文檔信任）

#### [x] T-001 `rawDeletedAt` 欄位與「24h 內刪除原始檔」承諾的處理 — ✅ 完成於 2026-05-19

- **現況**：`prisma/schema.prisma` 有 `UploadedChat.rawDeletedAt` 欄位、`docs/00` §三-3 與 `docs/04` 都寫了「成功處理後 24h 內刪除原始 .txt」。但 `server/line-parser/persist.ts` **根本沒儲存原始 .txt**（只存解析後的 `LineMessage`），且沒有任何排程程式寫過這個欄位。
- **影響**：承諾的是隱私，欄位卻是死碼。實際行為已經更嚴格（從未存原檔），但欄位的存在會誤導 reviewer / 未來自己。
- **採用方案 A**：移除欄位 + 文檔改寫成「原始 `.txt` 不入庫」。
- **實作 log**：
  - 從 `prisma/schema.prisma` 的 `UploadedChat` 移除 `rawDeletedAt` 欄位與 `///` 註解
  - `docs/04` schema 區同步移除該欄位
  - `docs/04` 在 `UploadedChat` 模型上方加註明文承諾：「原始 .txt 不寫入持久層，request 記憶體中 parse 完即丟棄」
  - `pnpm prisma validate` 通過、`pnpm prisma format` 已整理
  - **DB 同步留給使用者**：執行 `pnpm db:push` 才會在實際 Postgres 中 drop column；目前該欄位永遠是 `NULL`，drop 沒風險，但屬於改動 DB 的動作，刻意不替使用者執行
- **驗收結果**：
  - `grep -rn rawDeletedAt src/` → 0 hit ✅
  - `grep -rn rawDeletedAt prisma/` → 0 hit ✅
  - docs/04 文字自洽 ✅

---

### P1 — 本週內（文檔老化、低風險改善）

#### [x] T-002 更新 `docs/01-nextjs-project-structure.md` 的目錄樹與範例 — ✅ 完成於 2026-05-19

實際結構比文檔 §二多了 Week 4–6 演進的檔案，文檔需要回填，否則新進協作者會 mismatch。

具體需補上：

- `src/app/api/`：
  - `chat/history/route.ts`、`chat/session/route.ts`
  - `ingest/preview/route.ts`
  - `persona/{activate,estimate,overrides,status,versions}/route.ts`
  - `health/route.ts`
- `src/app/memory/page.tsx`（Week 5 memory transparency 頁面）
- `src/server/persona/{annotate-batch,status,overrides}.ts`
- `src/server/chat/session.ts`
- `src/server/memory/{embed-chunks,episodes}.ts`
- `src/server/line-parser/{metadata,persist}.ts`
- `src/server/{user,audit}.ts`
- `src/components/cookie-shell/{Scene,PostFX,dynamic,index}.tsx`、`hooks/{useBreathing,useDocumentVisible,useReducedMotion}.ts`
- `src/types/{ingest,persona-overrides}.ts`

同時：

- §四 `.env.example` 範例的 `localhost:5432` → **改為 `localhost:5433`**（與實際 docker-compose 一致，README 已說明）
- §十 開發優先順序對照表補上 Week 5 / 6（memory transparency、persona overrides、版本切換、a11y）

- **成本**：1 小時（純文檔）。
- **驗收**：文檔目錄樹 1:1 對應 `find src -type d`。
- **實作 log**：
  - §二目錄樹補上 `app/memory/`、`api/{health,persona/{estimate,status,versions,activate,overrides},chat/{session,history},ingest/preview}`、`server/{user,audit,persona/{annotate-batch,generate,status,overrides},memory/{embed-chunks,episodes},line-parser/{metadata,persist},chat/session}`、`components/cookie-shell/{Scene,PostFX,dynamic,index,hooks/{useBreathing,useDocumentVisible,useReducedMotion}}`、`types/{ingest,persona-overrides}`、`scripts/init-qdrant.ts`
  - §四 `.env.example` 範例 `5432 → 5433`，並加註與 docker-compose 一致
  - §十 進度表改寫 Week 3–6，對齊 commit history 的實際進度（mini-persona pipeline / Qdrant embedding / memory transparency / overrides + a11y）
  - 路徑抽樣驗證：8/8 對應檔案實際存在

---

#### [x] T-003 修正 `parse.ts` 的 BOM 處理為 `﻿` escape — ✅ 完成於 2026-05-19

- **現況**：`src/server/line-parser/parse.ts:7` 用 `raw.replace(/^﻿/, '')` —— 寫的是 BOM **實字元**。
- **問題**：實字元在編輯器、git diff、複製貼上時容易靜默消失，導致 Android UTF-8-BOM 檔案某天突然 parse 不出第一行的日期。
- **方案**：改成 `raw.replace(/^﻿/, '')`。
- **實作 log**：用 Python 直接改檔避免編輯器路徑上再被處理掉 BOM byte。原始 bytes 由 `EF BB BF`（3 bytes UTF-8 BOM）改為 `﻿`（7 ASCII bytes 的 escape sequence）。
- **驗收結果**：
  - `awk 'NR==7' parse.ts \| xxd` → 第 7 行只有 ASCII bytes、無 `ef bb bf` ✅
  - `pnpm type-check` 通過 ✅

---

### P2 — 有空再做（清理 / 體驗）

#### [x] T-004 移除或補實 `public/` 下的空目錄 — ✅ 完成於 2026-05-19

- **現況**：
  - `public/fonts/` — 空。實際字型走 `next/font/google`（`app/layout.tsx`），這個目錄沒用途。
  - `public/shaders/` — 空。Shader 已內嵌在 `components/cookie-shell/shaders/egg.ts`，這個目錄沒用途。
  - `public/sounds/` — 空。`docs/02` §十二提到 awakening 動畫要搭配「低頻嗡鳴 + click」音效。
- **實作 log**：
  - `rm -rf public/fonts public/shaders`（兩個目錄只有 `.gitkeep`）
  - `public/sounds/` 保留並在 `docs/01` §二目錄樹註明「保留給 awakening sfx 用，目前未實作」+「字型走 next/font/google；shader 內嵌於 egg.ts」

---

#### [x] T-005 Awakening 動畫實作（onboarding 完成時的高光時刻） — ✅ 完成於 2026-05-19

- **現況**：`docs/02` §十二明確規範了「粒子聚合成蛋形 → 蛋形 scale 0→1 → 配 Bloom 衰減」的 4–6 秒戲劇性畫面。`onboarding/process/page.tsx` 已呼叫 `setMode('awakening')`，但 `Egg` / `ParticleField` 從未消費這個 mode → 視覺承諾沒兌現。
- **採用設計**：store 集中管控 `awakeningStartedAt` + `AWAKENING_DURATION_MS=4000`，export `getAwakeningProgress()` 派生函式（不寫回 state，避免每幀 setState）。視覺分兩拍：粒子先聚合（0–1.0），蛋形 0→1 出現（0.5–1.0 用 smoothstep）。
- **實作 log**：
  - `hooks/useCookieState.ts`：新增 `awakeningStartedAt: number | null`、`AWAKENING_DURATION_MS` 常數、`getAwakeningProgress()` 派生函式；`setMode` 切到 `'awakening'` 時自動寫入時間戳，切到其他 mode 時清空
  - `ParticleField.tsx`：新增 `outerPositions`（半徑 2.5–4 球殼上的隨機散開點），mode 從非-awakening 切到 awakening 時用 `useEffect` 把 attribute reset 到 outer；`useFrame` 在 awakening 期間用 `easeInOutCubic(progress)` lerp outer → target；其他 mode 維持既有 velocity-based 漂浮
  - `Egg.tsx`：awakening 時 `awakeningScale = smoothstep(0.5, 1, progress)` 乘進 baseScale → 蛋形在粒子聚合過半後才漸顯；awakening 期間 mesh 緩慢自轉給聚合過程方向感
  - `app/onboarding/process/page.tsx`：對齊 `AWAKENING_DURATION_MS + 200ms`（緩衝給 smoothstep 收尾）
- **驗收結果**：
  - `pnpm type-check` 通過 ✅
  - `pnpm lint` 通過 ✅
  - **實機視覺需手動驗證**：跑 `pnpm dev` 進 `/onboarding/process` 應該看到「散開球殼粒子 → 4 秒內聚合進蛋形體積 → 蛋形在後半段從 0 漸大顯形 → 4.2s 後切 idle 呼吸」
- **未做的可選項**：
  - Web Audio API 播 ambient hum + click（要放音效檔到 `public/sounds/`）— 留給未來
  - Bloom 強度 1.5 → 0.4 衰減 — 目前 PostFX 是常數，要做需在 awakening 期間動態調 Bloom intensity，複雜度與視覺收益不成比例，先略過

---

#### [x] T-006 行動裝置降階策略落地 — ✅ 完成於 2026-05-19（無需動工）

- **查證結果**：`Scene.tsx` 已完整實作降階：
  - `particleCount = isMobile ? (hero ? 500 : 300) : (hero ? 1200 : 600)` — 對應 `docs/02` §十三規範
  - `floatProps` 在 `reducedMotion` 時 `speed/rotationIntensity/floatIntensity = 0`
  - `CookieShell.tsx` 也已: `dpr={isMobile ? [1, 1.5] : [1, 2]}`、`frameloop` 隨 tab 可見性與 reduced-motion 切換、`reducedMotion` 時直接不掛 `<PostFX>`
- **結論**：本項是我之前 audit 的誤判（沒打開 Scene.tsx 就懷疑），實際完全合規，不需動工。

---

### P3 — 觀望（不急、看是否真的需要）

#### [x] T-007 shadcn/ui 元件按需引入 — ✅ 完成於 2026-05-19

- **觸發**：`settings/page.tsx` 用 `window.confirm()` 處理 destructive action，與專案「白色虛空 + 玻璃感 / 慢，是一種尊重」的視覺哲學不一致。
- **採用方案**：不跑 shadcn CLI（避免網路依賴與意外改動 globals.css），直接用已裝在 deps 的 `@radix-ui/react-dialog` 手寫一個 thin wrapper 進 `components/ui/dialog.tsx`，貼專案的 `cookie-bg` token。
- **實作 log**：
  - 新增 `src/components/ui/dialog.tsx` — 包 Radix `Root/Trigger/Portal/Overlay/Content/Title/Description/Close`，外加 `DialogHeader/DialogFooter` 排版 helper
  - 改 `app/settings/page.tsx`：移除 `confirm()`，改 controlled `<Dialog open>` + 取消 / 確認雙按鈕；清除中 disable cancel 避免使用者中斷 API
  - 文案也加長為「對話 / chunks / persona / episodic memory / Qdrant 向量都會清掉」，明確列出 blast radius
- **驗收**：`pnpm type-check` ✅、`pnpm lint` ✅。視覺與動畫需實機確認（Tailwind 4 內建 `animate-in/animate-out` keyframes 是否生效；不生效也只是無 fade，功能正常）。

---

#### [x] T-008 Android 全形括號格式抽樣驗證 — ✅ 完成於 2026-05-19

- **實作 log**：
  - 新增 `scripts/test-parse.ts`，內建 4 個 fixture：
    1. iOS 半形括號 `(週一)` + UTF-8 BOM + 多行訊息 + 貼圖 / 照片 / URL / 已收回
    2. Android 全形括號 `（週一）` + `-` 分隔日期 + 語音 / 通話紀錄 / 檔案 + 3 人群組
    3. Android 英文星期 `(Mon)`
    4. `[影片]` 與 `[檔案]` 標記
  - 每個 fixture 驗證 `extractFileMetadata` 抓得到 chatRoom / detectedType / speakerCount，與 `parseLineTxt` 解析出的 message 數量、type 涵蓋率，並走過 `chunkByTimeGap` 確認不崩
  - 支援 `pnpm test:parse <file.txt>` 模式 dump 真實檔的 metadata，不寫 DB
  - 順手修了 `metadata.ts:28` 漏改的 BOM 實字元（T-003 只改了 parse.ts）
  - `package.json` 加 `"test:parse": "tsx scripts/test-parse.ts"`
- **驗收結果**：`pnpm test:parse` → **4/4 passed** ✅

---

## 三、不需要實作的「落差」（記錄結論避免日後重複討論）

| 項目 | 結論 |
|---|---|
| `manualOverrides` 是否真的進 system prompt？ | ✅ 已實作。`server/persona/update.ts` 的 `getActivePersona` 回傳 `applyOverrides(raw, overrides)` 的 `merged` 版本，`chat/pipeline.ts` 用的就是這個。 |
| `.env.example` 是否與 docker-compose 一致？ | ✅ `.env.example` 已是 5433。要改的是 `docs/01` 文檔範例（見 T-002）。 |
| `styles/{glitch,tokens}.css` 沒被 import？ | ✅ 已在 `app/layout.tsx` 第 4–5 行 import。 |
| `/api/health` 是否存在？ | ✅ 存在，`railway.json` healthcheck 可正常運作。 |
| `next/dynamic` + `ssr: false` 給 R3F？ | ✅ `components/cookie-shell/dynamic.tsx` 有處理。 |
| PII 過濾？ | ✅ `extract.ts` 的 `scrubPII` 過濾 email / phone。 |
| Audit log 寫入點？ | ✅ `server/audit.ts` + 各 mutation API 都有呼叫。 |

---

## 四、預估總工時

| 優先序 | 任務 | 工時 |
|---|---|---|
| P0 | T-001 | 0.5h |
| P1 | T-002, T-003 | 1.1h |
| P2 | T-004, T-005, T-006 | 1.5d |
| P3 | T-007, T-008 | 視需要 |

**P0 + P1 共約 1.5 小時可完成**，建議優先處理。P2 的 T-005（Awakening 動畫）雖然不影響功能，但對專案精神有意義，建議單獨排一天做。
