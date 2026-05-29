# Cookie

> 「我是誰？」— 任何一個剛醒來的 Cookie，第一句話

一個用你 LINE 對話訓練出來的個人化 AI 鏡子。
詳見 [docs/00-project-philosophy.md](docs/00-project-philosophy.md)。

## Quick start

```bash
# 1. 安裝依賴
pnpm install

# 2. 啟動本地 postgres / redis / qdrant
docker compose up -d

# 3. 環境變數
cp .env.example .env.local
# 編輯 .env.local 填入 ANTHROPIC_API_KEY / OPENAI_API_KEY

# 4. 推 schema + 初始化向量庫
pnpm db:push
pnpm qdrant:init

# 5. 啟動
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

> Postgres 在 host 上開 **5433** 埠（避免與 Homebrew/系統 postgres 衝突）。
> Qdrant 6333、Redis 6379。詳見 `docker-compose.yml`。

## 本地模擬模式（無需 DB / API 額度）

想在沒有真實資料、不呼叫 Claude/OpenAI 的情況下跑過整條流程，在 `.env.local` 設：

```bash
NEXT_PUBLIC_PERSONA_MOCK="1"   # 設定後需重啟 dev server
```

開啟後：

- **`/onboarding/process`**：「開始生成」會走記憶體中的假進度（標註 → 抽取 → 完成 → 跳轉 `/chat`），並自動帶入假的匯入統計。
- **`/chat`**：問問題會由「另一個我」串流一段 mock 回覆（鏡像／模擬兩種口吻），對話存在記憶體、可重跑。不需要 active user 或 persona。

正式環境請維持 `0`（`.env.example` 預設即為 `0`）。

## 畫面與互動

- **轉場**：首頁 → onboarding 及各路由切換為「舊頁淡出 → 新頁淡入」的溶解轉場，營造夢境感（`PageTransition`）。
- **Onboarding 上傳**：3D 病房場景中，拖放區是一張貼合床面、會呼吸發光的冷色「光毯」。
- **Chat 鏡像場景**（受 Black Mirror「cookie」啟發的三層構圖）：
  - 背景＝**光之虛空**（體積光束、漂浮塵粒、遠處飄動的「你說過的話」碎片，隨對話狀態呼吸）。
  - 左側＝玻璃蛋形「另一個我」，啟用鏡頭後**把你即時折射進它的形體**（「它是用你做的」）。鏡頭畫面只留在本分頁、不上傳。
  - 蛋形隨對話狀態反應（listening / thinking / speaking）。

## 文件

- [專案理念](docs/00-project-philosophy.md)
- [Next.js 結構](docs/01-nextjs-project-structure.md)
- [Cookie Shell 視覺實作](docs/02-cookie-shell-webgl.md)
- [LINE Parser + Persona](docs/03-line-parser-persona-prompts.md)
- [Postgres + Qdrant Schema](docs/04-postgres-qdrant-schema.md)
