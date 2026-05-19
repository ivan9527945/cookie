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

## 文件

- [專案理念](docs/00-project-philosophy.md)
- [Next.js 結構](docs/01-nextjs-project-structure.md)
- [Cookie Shell 視覺實作](docs/02-cookie-shell-webgl.md)
- [LINE Parser + Persona](docs/03-line-parser-persona-prompts.md)
- [Postgres + Qdrant Schema](docs/04-postgres-qdrant-schema.md)
