# Cookie — Next.js 專案初始化結構

本文件規範 Cookie 專案的前端 / 全端骨架。技術選型以「Next.js + Railway 一鍵部署」為前提，避免引入需要獨立部署的 Python 服務。

## 一、Tech Stack

### 核心框架

| 類別 | 選型 | 版本 | 理由 |
|------|------|------|------|
| Framework | **Next.js** | 15.x (App Router) | SSR + API Routes 一站式，Railway 友善 |
| Runtime | **Node.js** | 20 LTS | Railway 預設支援 |
| Language | **TypeScript** | 5.x (strict) | 型別安全是這專案的核心要求 |
| React | **React** | 19 | 配合 R3F v9 |

### UI 層

| 類別 | 選型 | 版本 | 理由 |
|------|------|------|------|
| Styling | **Tailwind CSS** | 4.x | 配合自訂 design tokens（黑鏡白色調） |
| Component Lib | **shadcn/ui** | latest | 可完全自訂、貼合品牌調性 |
| Animation | **Framer Motion** | 12.x | 頁面切換、UI 動畫 |
| 3D / WebGL | **React Three Fiber** | 9.x | Cookie Shell 主視覺 |
| R3F Helpers | **@react-three/drei** | latest | 常用 helpers (Float, MeshTransmissionMaterial) |
| Post-processing | **@react-three/postprocessing** | latest | Bloom、Chromatic Aberration、Glitch |
| Icons | **Lucide React** | latest | 線條風格契合冷調介面 |
| Font | Inter / IBM Plex Mono / Noto Sans TC | (Google Fonts) | 介面 / 系統 / 中文 |

### 資料層

| 類別 | 選型 | 版本 | 理由 |
|------|------|------|------|
| ORM | **Prisma** | 6.x | 配合 Postgres + pgvector |
| DB Driver | **@prisma/client** | 6.x | — |
| Vector DB Client | **@qdrant/js-client-rest** | 1.17.x | Qdrant 官方 JS client |
| Cache / Session | **ioredis** | 5.x | Railway Redis 連線 |
| Validation | **Zod** | 3.x | API 輸入驗證 + 型別推導 |

### LLM / Embedding

| 類別 | 選型 | 理由 |
|------|------|------|
| LLM | **@anthropic-ai/sdk** | Claude（主力 model）|
| Embedding | **OpenAI text-embedding-3-small** | 便宜、品質好、SDK 完整。中文表現足夠 |
| (備援) Embedding | BGE-M3 via HF Inference API | 想要更強中文支援時切換 |

### 開發工具

| 類別 | 選型 | 理由 |
|------|------|------|
| Package Manager | **pnpm** | 速度快、磁碟省 |
| Linter | **ESLint** + **eslint-config-next** | — |
| Formatter | **Prettier** + `prettier-plugin-tailwindcss` | — |
| Git Hooks | **Husky** + **lint-staged** | commit 前自動 lint |
| Type Check | TypeScript strict mode | — |

---

## 二、Folder Layout

```
cookie/
├── .env.example
├── .env.local                      # gitignored
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── railway.json                    # Railway 部署設定
├── README.md
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   ├── fonts/
│   ├── shaders/                    # GLSL files (可選, 也可 inline)
│   └── sounds/                     # ambient hum, glitch sfx
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (font, theme provider)
│   │   ├── page.tsx                # Landing / "INITIALIZE"
│   │   ├── globals.css             # Tailwind base + design tokens
│   │   │
│   │   ├── onboarding/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # 解釋 + 上傳 LINE .txt
│   │   │   └── process/
│   │   │       └── page.tsx        # 處理進度 + Cookie 蛋成形動畫
│   │   │
│   │   ├── chat/
│   │   │   ├── layout.tsx          # Chat shell (Cookie 漂浮在背景)
│   │   │   └── page.tsx
│   │   │
│   │   ├── persona/
│   │   │   └── page.tsx            # 人格剖面頁
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── ingest/
│   │       │   └── route.ts        # POST: 接收 LINE .txt, 解析入庫
│   │       ├── persona/
│   │       │   ├── route.ts        # GET: 取得 persona profile
│   │       │   └── generate/
│   │       │       └── route.ts    # POST: 觸發 persona 生成
│   │       ├── chat/
│   │       │   └── route.ts        # POST: 對話入口（streaming）
│   │       └── memory/
│   │           └── route.ts        # GET / DELETE: 記憶管理
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 元件
│   │   ├── cookie-shell/           # Cookie 主視覺（R3F）
│   │   │   ├── CookieShell.tsx
│   │   │   ├── EggGeometry.tsx
│   │   │   ├── ParticleField.tsx
│   │   │   ├── shaders/
│   │   │   │   ├── egg.vert.glsl
│   │   │   │   └── egg.frag.glsl
│   │   │   └── hooks/
│   │   │       └── useCookieState.ts
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SystemMessage.tsx
│   │   │   └── TypewriterText.tsx
│   │   ├── onboarding/
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ProcessingProgress.tsx
│   │   └── shared/
│   │       ├── GlitchText.tsx
│   │       └── ScanLines.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── redis.ts                # ioredis client
│   │   ├── qdrant.ts               # Qdrant client
│   │   ├── anthropic.ts            # Claude client
│   │   ├── embedding.ts            # embedding helper
│   │   └── utils.ts                # cn(), 等
│   │
│   ├── server/                     # 純後端邏輯（不能被 client import）
│   │   ├── line-parser/
│   │   │   ├── parse.ts            # LINE .txt → LineMessage[]
│   │   │   ├── chunk.ts            # 對話分塊
│   │   │   └── annotate.ts         # LLM 自動標註
│   │   ├── persona/
│   │   │   ├── extract.ts          # 從對話抽取 persona profile
│   │   │   ├── prompts.ts          # persona 抽取的 prompt templates
│   │   │   └── update.ts           # 增量更新 persona
│   │   ├── memory/
│   │   │   ├── episodic.ts         # 情境記憶寫入
│   │   │   ├── retrieve.ts         # RAG 檢索
│   │   │   └── importance.ts       # 重要性評分
│   │   └── chat/
│   │       ├── pipeline.ts         # 完整對話 pipeline
│   │       └── system-prompt.ts    # 動態組裝 system prompt
│   │
│   ├── types/
│   │   ├── line.ts                 # LINE 訊息相關型別
│   │   ├── persona.ts              # Persona profile 型別
│   │   ├── memory.ts               # 記憶相關型別
│   │   └── chat.ts                 # 對話相關型別
│   │
│   ├── styles/
│   │   ├── tokens.css              # CSS variables (顏色、間距)
│   │   └── glitch.css              # glitch 效果
│   │
│   └── hooks/
│       ├── useChat.ts              # 對話 hook (streaming)
│       ├── useTypewriter.ts
│       └── usePersona.ts
│
└── scripts/
    ├── seed-test-data.ts
    └── reset-vector-db.ts
```

---

## 三、`package.json`

```json
{
  "name": "cookie",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "qdrant:reset": "tsx scripts/reset-vector-db.ts",
    "prepare": "husky"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@prisma/client": "^6.0.0",
    "@qdrant/js-client-rest": "^1.17.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/postprocessing": "^2.16.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "framer-motion": "^12.0.0",
    "ioredis": "^5.4.0",
    "lucide-react": "^0.460.0",
    "next": "^15.0.0",
    "openai": "^4.70.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.0",
    "three": "^0.170.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.170.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "postcss": "^8.4.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "prisma": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

---

## 四、`.env.example`

```bash
# === Database ===
DATABASE_URL="postgresql://postgres:password@localhost:5432/cookie?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/cookie?schema=public"

# === Vector DB (Qdrant) ===
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""   # Railway 部署時必填

# === Redis (Session / Cache) ===
REDIS_URL="redis://localhost:6379"

# === LLM ===
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5"   # 或 claude-opus-4-7

# === Embedding ===
OPENAI_API_KEY="sk-..."
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"

# === App ===
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# === Feature Flags ===
ENABLE_GLITCH_EFFECTS="true"
ENABLE_AMBIENT_SOUND="false"
```

---

## 五、`next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Three.js 在 SSR 上會炸，把它列為 transpile target 避免 ESM 問題
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

  experimental: {
    // 大型 LINE .txt 上傳
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // Cookie shell 用到的 shader 檔案
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });
    return config;
  },

  // 安全性 headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 六、`railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

## 七、Railway Services

需要在 Railway 上建立以下服務：

| Service | Source | Purpose |
|---------|--------|---------|
| **web** | GitHub repo | Next.js app |
| **postgres** | Railway Template | Postgres + pgvector (Railway 預設已含) |
| **redis** | Railway Template | Session memory |
| **qdrant** | Docker `qdrant/qdrant:latest` | Vector DB |

服務間透過 Railway 內網通訊（`*.railway.internal`），免外部流量費。

部署後在 Railway 環境變數面板填入 `ANTHROPIC_API_KEY` 與 `OPENAI_API_KEY`，並把 DB / Redis / Qdrant 的內網 URL 對應到 `DATABASE_URL` / `REDIS_URL` / `QDRANT_URL`。

---

## 八、初始化指令

```bash
# 1. 建立專案
pnpm create next-app@latest cookie \
  --typescript --tailwind --app --src-dir --use-pnpm \
  --import-alias "@/*" --no-eslint
cd cookie

# 2. 安裝核心依賴
pnpm add @anthropic-ai/sdk openai \
         @prisma/client @qdrant/js-client-rest ioredis zod \
         @react-three/fiber@beta @react-three/drei @react-three/postprocessing three \
         framer-motion lucide-react \
         class-variance-authority clsx tailwind-merge \
         @radix-ui/react-dialog @radix-ui/react-progress @radix-ui/react-slot

# 3. 安裝 dev 依賴
pnpm add -D prisma tsx @types/three husky lint-staged \
            prettier prettier-plugin-tailwindcss

# 4. 初始化 Prisma
pnpm prisma init

# 5. 初始化 shadcn/ui
pnpm dlx shadcn@latest init

# 6. 初始化 husky
pnpm exec husky init
echo "pnpm lint-staged" > .husky/pre-commit

# 7. 啟動本地依賴（用 Docker compose 或 Railway CLI）
# 推薦本地用 Docker 跑 postgres / redis / qdrant，部署時換 Railway

# 8. push schema & 啟動
pnpm db:push
pnpm dev
```

---

## 九、本地開發 `docker-compose.yml`（可選）

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: cookie
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - '6333:6333'
      - '6334:6334'
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  pg_data:
  redis_data:
  qdrant_data:
```

---

## 十、開發優先順序對照

| Week | 目標 | 主要檔案 |
|------|------|----------|
| 1 | 骨架 + Cookie Shell prototype | `app/page.tsx`, `components/cookie-shell/*` |
| 2 | LINE parser + onboarding 流程 | `server/line-parser/*`, `app/onboarding/*` |
| 3 | Persona 生成 + Postgres schema | `server/persona/*`, `prisma/schema.prisma` |
| 4 | Qdrant 整合 + chat API | `lib/qdrant.ts`, `app/api/chat/route.ts` |
| 5 | Chat UI + memory layer | `components/chat/*`, `server/memory/*` |
| 6 | Polish、glitch 特效、persona 剖面頁 | `app/persona/*`, `components/shared/*` |

---

## 注意事項

- **Three.js SSR**：所有用到 R3F 的 component 必須是 `'use client'`，且最好用 `next/dynamic` 動態載入（`ssr: false`），避免 hydration mismatch
- **streaming API**：對話 endpoint 必須回傳 streaming response（`text/event-stream`），讓 Cookie 的「思考」過程能即時呈現
- **LINE .txt 編碼**：iOS 匯出是 UTF-8，Android 可能是 UTF-8 with BOM，parser 要兩種都吃
- **Prisma + pgvector**：Prisma 對 vector type 支援還不完美，pgvector 操作建議用 raw query（`$queryRaw`）或直接走 Qdrant
