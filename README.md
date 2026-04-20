<div align="center">

# <img src="apps/web/public/logo-icon.svg" width="36" height="36" alt="FlowGen logo" /> FlowGen

### Automated user documentation videos grounded in your codebase

FlowGen explores your codebase, generates step-by-step user guides, and records walkthrough videos — all automatically. Point it at a repo and let it create living documentation that stays in sync with your code.

[**Report Bug**](https://github.com/dragonhack-flowgen/flowgen/issues)

---

*Built at [DragonHack 2026](https://dragonhack.si) — received outstanding feedback and we're now shipping it as a real product.*

</div>

<br />

## ✨ What it does

1. **Discovers flows** — Points at your repository and automatically identifies user-facing features
2. **Generates guides** — Uses AI to create step-by-step walkthroughs grounded in actual code
3. **Records videos** — Spins up a headless browser to execute the guide and record a real walkthrough video
4. **Stays in sync** — Detects code changes and flags outdated documentation for re-generation

<br />

## 🏗 Architecture

```
flowgen/
├── apps/
│   ├── web/             → React frontend (Vite + TanStack Router)
│   ├── backend/         → Hono API server (Node.js + Drizzle ORM)
│   └── recorder-api/    → Python recording service (browser-use, Docker)
├── docker-compose.yml   → PostgreSQL + Recorder API containers
└── turbo.json           → Turborepo orchestration
```

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Vite 7, TanStack Router, TanStack Query, Tailwind CSS 4, shadcn/ui |
| **Backend** | Hono, Drizzle ORM, Zod, PostgreSQL 16 |
| **Recorder** | Python, browser-use, Playwright, UploadThing |
| **Tooling** | Turborepo, pnpm workspaces, TypeScript 5.9, Knip |

<br />

## 🔒 Engineering Principles

We deliberately prioritized quality over speed during development:

- **End-to-end type safety** — Hono RPC gives us fully typed API calls from the frontend with zero code generation. A type error in a route handler surfaces instantly in the React component calling it.
- **Hand-crafted UX** — Every screen was manually designed and iterated on. No AI-generated layouts — we believe great UX requires human taste and attention to detail.
- **Clean, robust code** — Zod validation on every API boundary, proper error handling, structured monorepo with strict linting via ESLint and Knip for dead code elimination.
- **Collaboration via Linear** — We managed our entire workflow through [Linear](https://linear.app) — sprint planning, issue tracking, and prioritization all lived there.

<br />

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 |
| [pnpm](https://pnpm.io) | 9.x |
| [Docker](https://www.docker.com) | Latest |

### 1. Clone & install

```bash
git clone https://github.com/dragonhack-flowgen/flowgen.git
cd flowgen
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# LLM Provider for browser-use agent
BROWSER_USE_MODEL_PROVIDER=browser_use
BROWSER_USE_MODEL=                          # e.g. gpt-4o

# API Keys
BROWSER_USE_API_KEY=                        # Your browser-use API key
OPENAI_API_KEY=                             # Your OpenAI API key

# Database (default works with docker-compose)
DATABASE_URL=postgres://flowgen:flowgen@localhost:5433/flowgen

# Backend integration
INTERNAL_API_SECRET=flowgen-internal-dev-secret
```

### 3. Start everything

```bash
pnpm dev
```

This single command (powered by Turborepo) will:

1. **Start PostgreSQL** and the **Recorder API** via Docker Compose
2. **Run database migrations** automatically
3. **Start the backend** API server on `http://localhost:8001`
4. **Start the frontend** dev server on `http://localhost:5173`

### 4. Open the app

Navigate to **[http://localhost:5173](http://localhost:5173)**.

### 5. Connect your codebase

Go to **Settings** in the sidebar and paste the URL of the Git repository you want to generate documentation for. Once saved, FlowGen's agent will have access to your codebase and can start discovering flows automatically.

<br />

## 📦 Project Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm knip` | Find unused files, exports, and dependencies |

<br />

## 🐳 Services

| Service | Port | Description |
|---|---|---|
| Frontend | `5173` | React SPA with Vite HMR |
| Backend | `8001` | Hono REST API |
| Recorder API | `8002` | Python service for browser recording (Docker) |
| PostgreSQL | `5433` | Database (Docker) |

<br />

## 🗺 What's Next

We received really positive feedback at DragonHack and have decided to ship FlowGen as a real product. Stay tuned.

<br />

---

<div align="center">

Built with ☕ and conviction by the FlowGen team

</div>
