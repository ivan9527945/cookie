# 鏡子論文 ↔ 實作落差評估與 TODO

> 審查日期：2026-05-20
> 對照範圍：`docs/05-differentiation-mirror-thesis.md`（原 `06`，2026-05-20 重編號）× 全 `src/`、`prisma/`、`lib/anthropic.ts`
>
> 結論：「鏡子的態度」（誠實、慢、不代理、不依附、不社交）已寫進 system prompt 與介面文案，產品骨架對齊。但**讓鏡子真正像鏡子的觀察工具**——語言指紋 / 迴避偵測 / 跨情境矛盾 / 時間切片 / 反問模式 / 證據鏈——以及**三項倫理機關**（`no-training` flag、audit log 對使用者開放、本地 LLM 路徑）目前仍停在文檔承諾。
>
> 更新（2026-05-20）：原 Red Line 4「拒絕死後永生」已撤回，「模擬已故親人」用例改為可接受，見 T-101。

---

## 一、評估維度

延用 `docs/05` 的三維評估：

| 維度 | 說明 |
|---|---|
| **必要性** | 影響鏡子論文的核心命題兌現 / 倫理承諾 / 差異化定位 |
| **成本** | 實作所需工時與風險（含 schema / UX / prompt） |
| **優先序** | P0 = 倫理承諾不能跳票；P1 = 文檔信任 + 主架構；P2 = 鏡子工具強化；P3 = 大範圍工程 |

---

## 二、TODO 清單

### P0 — 立刻處理（倫理承諾未兌現）

#### [—] T-101 死後永生攔截頁 — 已撤回（2026-05-20）

- **原規劃**：onboarding 第一頁攔截「模擬已故親人」用例 → 拒絕頁 + 心理諮商資源
- **決議**：撤回原 Red Line 4，**接受「模擬已故親人」用例**。原攔截頁 / 拒絕頁不再實作
- **後續清理（文檔同步）— 已完成於 2026-05-20**：
  - ✅ `docs/05` §四-2 整段 Red Line 4 移除，標題改為「**三條** Red Lines」，並在原位留撤回註記
  - ✅ `docs/00` §四 非目標清單刪除「不是死後數位永生方案」，並在原位留撤回註記
- **是否要做誠實揭露（待決）**：
  - 撤回 Red Line 不等於「完全不處理」。基於 `docs/00` 的「誠實 > 擬真」基調，仍可考慮在 onboarding 加一段揭露：「對已故者的模擬，準確率受限於對話資料量，請理解這是一個模仿物而非那個人本身」——只揭露、不攔截
  - 若採用，工時約 30 分鐘（一個 `<aside>` + 文案）
- **程式碼影響**：目前流程已無實作層攔截，撤回後與現況一致，**不需要程式碼變動**

---

#### [x] T-102 Anthropic API 帶 `no-training` metadata — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §四-3、`docs/00` §三-3
- **承諾**：呼叫 LLM API 時明確帶上 `no-training` flag（Anthropic / OpenAI 都支援）
- **現況**：`src/lib/anthropic.ts:13` `new Anthropic({ apiKey })` 純預設，無任何 metadata / zero-data-retention 設定。所有 `messages.create` 呼叫都沒帶 `metadata` 欄位
- **影響**：隱私承諾未實際生效。雖然 Anthropic Console 帳號層級可以全域設定，但「**程式碼層級也明示**」才是文檔承諾
- **建議方案**：
  - `messages.create` 統一帶 `metadata: { user_id: <hash> }`（已是 zero-retention 觸發條件之一）
  - 在 `lib/anthropic.ts` 加 helper `createMessage(params)` 集中注入，避免散落
  - 確認帳號層級已開 Zero Data Retention（這是組織設定，不是 SDK 參數）
  - 若帳號層級未開 ZDR，需明確標示「目前的隱私承諾受限於 Anthropic 帳號設定」，不要假裝有
- **成本**：1 小時（含驗證）
- **驗收**：`grep -n "metadata" src/server/**/*.ts` 至少在 chat / persona / annotate 三處出現

---

#### [x] T-103 修正 upload 頁「24h 刪除原檔」誤導文案 — ✅ 完成於 2026-05-20

- **文檔位置**：T-001 已決議「原始 .txt 不入庫」
- **現況**：`src/app/onboarding/page.tsx:120` 仍顯示「原始檔案會在處理完成後 24 小時內刪除，只保留結構化資料」
- **影響**：UI 自己承諾的事與 schema / 行為不一致，讀者會誤以為原檔被儲存了又刪
- **建議方案**：改為「上傳的 `.txt` 不會被儲存，解析完即丟棄，只保留結構化訊息」
- **成本**：5 分鐘
- **驗收**：頁面文案與 `docs/04` 的描述一致

---

### P1 — 本週內（文檔信任 + 主架構對齊）

#### [x] T-104 Audit log 對使用者開放 — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §四-4
- **承諾**：「audit log 對使用者開放——你可以看到 Cookie 每一次回應引用了哪些訓練資料、檢索了哪些記憶、用了哪個版本的 persona profile」「儀器是可以打開看裡面齒輪的」
- **現況**：`server/audit.ts` 只寫不讀，沒有 `/audit` 頁、沒有 `/api/audit` GET。Audit row 對使用者完全不可見
- **建議方案**：
  - `src/app/api/audit/route.ts` GET：分頁回最近 100 筆，篩選 actor=user.id
  - `src/app/audit/page.tsx`：以時間軸呈現，每筆顯示 `[時間] [action] [details JSON]`（細節摺疊）
  - 重點 action 加 human-readable 標籤：`chat_session_start` → 「開了一個新對話」、`edit_persona` → 「你修正了 persona」
  - chat 對話旁邊的「想起 N 段對話」caption 點開可看是哪幾段（這部分需要 `chat_session_start` event 額外記錄 retrieved IDs，再到 audit 點開可以追溯）
- **成本**：4-6 小時（API + 頁面 + 細節呈現）
- **驗收**：可以打開頁面看到自己的所有操作軌跡與 chat retrieval 紀錄

---

#### [x] T-105 Persona 是日常 home，Chat 是亮點高潮 — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §五-1「主畫面是 Persona Profile，不是對話框」
- **與文檔的偏離（2026-05-20 對齊）**：文檔原本主張「persona 是 home，chat 是次要 tab」。實際定位修正為——**「鏡子的我」是 chat（會說話、會反問的那個），persona 是 spec sheet**。亮點是 chat，persona 是讓你看清楚之後再進去對話的前置房間
- **現況**：landing → onboarding → process → 直接導 `/chat`，沒有「first contact 儀式」；回訪使用者也只看到聊天頁；persona 是 chat toolbar 上的一個 link
- **建議方案**：
  - **路由**：
    - `onboarding/process/page.tsx` awakening 結束的 `router.push` 改為 `/chat`（亮點高潮：見鏡子的我本人）
    - `app/page.tsx` 加 server-side check：有 active persona 的回訪使用者 → `redirect('/persona')`（日常 home：回去檢視你的鏡像）
    - 首次訪客打開 `/`：保持 landing hero，CTA INITIALIZE 不變
  - **Chat 的 first-contact 儀式**：
    - DB 或 user record 加 `firstContactAt: DateTime?` 旗標
    - 第一次進入 `/chat`：Cookie 主動說一段開場白（不等使用者開口），例如：「我醒了。我是用你說過的話組成的——你想問我什麼？」
    - 配合 Cookie Shell：mode 從 `awakening` 平滑切到 `idle`，過程中 glitch 一下作為「初次穩定」訊號
    - 開場白播完後，旗標寫入，之後進入正常 chat 模式
  - **Persona 頁的 chat CTA**：
    - 位置：header 下方，**與「這是它看見的你」並列**，不藏在頁尾
    - 視覺：明亮、佔位、不收斂——例：明顯 border + 較大字體 + 蛋形小動畫
    - 文案：「**它已經醒著。要跟它說話嗎？** [ → 進入對話 ]」
    - 持續顯示，不因為已看過就消失
  - **Persona header 補資料量**：
    - `/api/persona/status` response 加 `messageCount` 與 `dayCount`（從 `LineMessage` 與 `UploadedChat` 統計）
    - header 改為「INSTRUMENT READOUT · v{n} · based on {N} messages across {D} days」
  - **Persona 頁的 Cookie Shell**：
    - header 旁加小型 Cookie Shell（4-6 rem），保留呼吸動畫
    - 提醒「你在跟一個數位實體互動，不是讀 PDF」
  - **Chat 的 toolbar**：
    - 保留 `persona / memory / settings` 連結（chat 是亮點不代表是孤島）
    - 左上加「← persona」返回連結，明示這是從 home 進來的
- **成本**：3-4 小時
  - 路由 + middleware：0.5h
  - First-contact 儀式（旗標 + 開場白 + Shell 動畫）：1.5h
  - Persona header 加資料量：0.5h
  - Persona CTA + 小型 Shell：1h
  - Chat toolbar 返回連結：0.5h
- **驗收**：
  - 第一次完成 onboarding 後第一個看到的是 chat，且 Cookie 主動說了一段開場白
  - 回訪使用者打開 `/` 自動進 `/persona`
  - Persona 頁的 chat CTA 一眼就看到，不需要找
- **連動**：與 T-107（鏡像對話模式）綁一起做。Chat 是亮點，但目前的 chat 體驗只是「普通 LLM 對話」，配不上「鏡子的我」這個定位——所以 T-107 從 P2 升到 P1，跟 T-105 一起規劃

---

#### [x] T-107 鏡像對話模式（反問優先 + `[模擬]` 標籤） — ✅ 完成於 2026-05-20（從 P2 升 P1）

- **升級理由**：T-105 把 chat 定為亮點高潮（「鏡子的我」就在這裡）後，目前「普通 LLM 對話」的體驗配不上這個定位。T-107 是讓 chat 真的像鏡子的關鍵
- **與 T-105 的關係**：**綁一起做**。T-105 提供舞台（first-contact 儀式 + 主推 CTA），T-107 提供對白風格（反問優先 + 證據攤開來）
- **文檔位置**：`docs/05` §五-4
- **承諾**：
  - 預設模式是「反問」不是「回答」——「你過去三個月提到工作的 47 次裡，有 31 次帶有負面語氣……」
  - 使用者要求「不要反問我」時切換成模擬模式，但訊息開頭灰色標籤 `[模擬：根據你過去的回應推估]`
- **現況**：
  - `system-prompt.ts` 沒有「優先反問」指令，現有規則是「模仿 LINE 訊息節奏 1-3 句」
  - 沒有 mode 切換機制，沒有任何 `[模擬]` 標籤系統
- **建議方案**：
  - system prompt 加段：「當使用者問你『該做什麼決定』時，優先**反問你觀察到的對話模式**而非給建議。回答前先盤點：retrieved 記憶裡有沒有他自己過去說過類似的話、傾向、情緒？把那個攤開來讓他自己看」
  - chat 介面加 toggle：`鏡像 ↔ 模擬`，切到模擬時 streaming bubble 前插一個 `<SystemMessage>[模擬：根據你過去的回應推估]</SystemMessage>`，永遠在
  - retrieved chunks 走進 prompt 時，順便算「同類問題的歷史出現次數 / 情緒分佈」，給 model 當燃料
- **成本**：1 天

---

### P2 — 有空再做（鏡子工具強化）

#### [x] T-106 矛盾偵測升級（情境化 / 接納 / 轉化的四象限標註） — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §五-2
- **承諾**：每個矛盾可以被使用者標註為「不同情境的我」「我知道這是我」「我想改變這個」三種狀態；Cookie 會記住「想改變」的條目並追蹤
- **現況**：`PersonaProfile.selfAwareness.contradictions: string[]` 只是純文字陣列，顯示在 persona 頁就結束了。沒有跨情境來源、沒有四象限標註動作
- **建議方案**：
  - schema 改為 `contradictions: Array<{ statement: string; sources: { context: string; chunkIds: string[] }[]; userTag?: 'context-shift' | 'accepted' | 'growth-target' | null }>`
  - persona 頁的「矛盾之處」section 加三個按鈕：「這是不同情境的我」/「我知道，這是我」/「我想改變這個」
  - tag 寫進 overrides 並進 system prompt 末段：「以下是使用者想成長的方向，對話中可以溫和反映」
- **成本**：1 天（schema migration + prompt 改 + UI + 寫測試確認 merge 邏輯）

---

#### [x] T-108 語言指紋（Conversational Footprint） — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §五-1 PERSONA PROFILE 範例
- **承諾**：平均句長、常用語頻率（「其實 412 次」「會不會 287 次」）、罕用詞類（絕對化用語）、code-switching 情境
- **現況**：完全沒做。`PersonaProfile.communicationStyle.commonPhrases` 是 LLM 產出的字串陣列，沒有頻率、沒有對照常模
- **建議方案**：
  - 在 `server/persona/generate.ts` 之外加 `server/persona/footprint.ts`：純統計，不靠 LLM
    - 平均句長、句長分佈（vs 華語常模 18.7 字）
    - top-N n-gram（過濾掉 stopwords）+ 出現次數
    - 絕對化用語頻率（「總是 / 從不 / 一定 / 絕對」）
    - code-switching 偵測：中→英 token ratio 按 chunk 主題分桶
  - 結果寫進 persona record 另一張表 `PersonaFootprint`
  - persona 頁加 section「語言指紋」
- **成本**：1-2 天（規則設計 + 結果穩定性）

---

### P3 — 觀望（大範圍工程，需要先確認是否真的值得）

#### [x] T-109 證據鏈（persona 條目 → LineMessage 來源追溯） — ✅ 完成於 2026-05-20（輕版：semantic search 重用）

- **文檔位置**：`docs/05` §五-1「每一項都可以點開看證據鏈」
- **現況**：persona 頁是純文字呈現，無法溯源
- **挑戰**：要做到「為什麼說我迴避討論父親」需要在 `generate.ts` 階段就讓 LLM 對每個歸納條目附 chunk references，這會大幅膨脹 token cost，且模型的引用可能不準
- **建議方案（如果做）**：
  - persona schema 每個 leaf 條目改成 `{ value, evidence: { chunkIds: string[], excerpt?: string } }`
  - persona 頁所有條目可點開 → 浮出對應的 LineMessage 片段（從 `chunk.startMessageId / endMessageId` 反查）
  - 風險：模型若引用錯，反而讓使用者更不信
- **成本**：2-3 天（含 prompt 工程確保引用準確）

---

#### [x] T-110 時間切片（Temporal Persona） — ✅ 完成於 2026-05-20（並排比較 view 未做）

- **文檔位置**：`docs/05` §五-3
- **承諾**：「2022 年的我 vs 2025 年的我」「跟 A 在一起時 vs 分手後」「最近一個月跟過去半年比」
- **現況**：只有「按生成時點」的版本切換（v1 / v2 / v3），不是「按輸入時段篩選」
- **建議方案**：
  - `generate.ts` 接受 `timeRange?: { from?: Date; to?: Date }` 和 `chatRoomIds?: string[]`
  - persona 頁加「生成新切片」按鈕，可選日期範圍與聊天室
  - 切片之間可並排比較（兩欄 diff view）
- **成本**：2 天

---

#### [x] T-111 迴避主題偵測（Avoidance Patterns） — ✅ 完成於 2026-05-20

- **文檔位置**：`docs/05` §五-1 範例「父親 / 失敗經歷 / 自己的長處」
- **挑戰**：「異常低的提及頻率」需要對比基準。是跟「華語常模」比，還是跟「同一個人在其他話題的提及量」比？前者沒有可靠資料、後者需要先標 chunk topic
- **建議方案**：
  - 先做 chunk-level topic tagging（已經有 `messageContext`，但結構化主題標籤還沒）
  - 用「使用者在他人對話中被提及的主題」vs「使用者主動提及的主題」做 delta
  - 高出現於別人說、低出現於自己說 = 候選迴避主題
- **成本**：3 天（標籤系統需要先建）

---

#### [—] T-112 本地 LLM 路徑（Ollama / Llama 3.3） — ⏸ 刻意延後（2026-05-20）

- **延後理由**：抽象層若無實機 Ollama 連線測試 + Llama 3.3 中文 persona 品質量測就交付，等於 shelfware——三個月後可能 API drift、實際品質未知、使用者也無法判斷該不該開
- **動工觸發條件**：本地端跑得起 Ollama + 有對中文 persona generation 做品質 baseline 之後再做
- **文檔位置**：`docs/05` §四-3、`docs/00` §三-3
- **現況**：`lib/anthropic.ts` 直接耦合 Anthropic SDK
- **挑戰**：persona / chat / annotate 三個 pipeline 對模型品質敏感程度不同。chat 換 Llama 3.3 可能還行，persona generate 換掉品質會掉很多
- **建議方案（將來做時）**：
  - 抽 `lib/llm.ts` 統一介面 `{ complete, stream, embed }`
  - 環境變數 `LLM_PROVIDER=anthropic | ollama` 切換
  - 不同 pipeline 允許獨立 override：`PERSONA_MODEL=anthropic`, `CHAT_MODEL=ollama`
  - 文檔誠實標示「本地模式品質會差，特別是 persona generation」
- **成本**：3-5 天，且需要實機測試 Llama 3.3 對中文 persona 的品質

---

## 三、不需要實作的「落差」（記錄結論避免日後重複討論）

| 項目 | 結論 |
|---|---|
| 「不允許別人跟你的 Cookie 對話」是否落地？ | ✅ 沒有 share / community / 公開 link 任何介面，產品層級就沒提供 |
| 「沒有晚安問候 / 主動推播」是否落地？ | ✅ 沒有 push notification subscription、沒有 cron 主動發訊息 |
| 「export response / send as me 按鈕」是否漏網？ | ✅ `MessageBubble.tsx` 不提供 copy / share / forward，只有純顯示 |
| Glitch 視覺承諾 | ✅ `PostFX.tsx:16` 有 `glitching` mode，shader 也有 `uGlitch` uniform |
| 「Cookie 在被問『你是真的嗎』時誠實回答」 | ✅ 寫進 `system-prompt.ts:9-15`。實際效果靠模型 follow，建議未來補 eval |

---

## 四、預估總工時

| 優先序 | 任務 | 工時 | 狀態 |
|---|---|---|---|
| P0 | T-102, T-103（T-101 已撤回） | 1-2h | ✅ 完成 |
| P1 | T-104, T-105, T-107（T-107 升級自 P2） | 2-3 天 | ✅ 完成 |
| P2 | T-106, T-108 | 2-3 天 | ✅ 完成 |
| P3 | T-109（輕版）, T-110, T-111 | 10-13 天 | ✅ 完成 3/4，T-112 刻意延後 |

**P0 是兌現文檔承諾的最低門檻，建議優先處理**——其中 T-102（`no-training` flag）是「文檔自己強調絕對不會跳票」的條目，跳票即失去差異化定位的可信度。

**P1 的 T-105 + T-107 應該綁一起做**——T-105 把 chat 定為亮點高潮（first-contact 儀式 + persona 主推 CTA），T-107 讓對話本身真的像鏡子（反問優先 + 證據攤開來）。兩條分開做的話，T-105 會有「舞台搭好但戲沒戲」的問題。

P2、P3 是「鏡子的銳利度」——做了會讓 Cookie 真的像個觀察工具，不做也不影響基本承諾。
