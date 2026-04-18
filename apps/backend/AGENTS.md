# Backend (Hono + pi-coding-agent)

TypeScript backend using Hono on Node.js with the pi-coding-agent SDK for AI-powered codebase exploration.

## Commands

Run from this directory (`apps/backend/`) or via Turborepo from repo root.

```bash
pnpm dev          # Dev server with hot reload (port 8000)
pnpm build        # TypeScript build
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm typecheck    # tsc --noEmit
pnpm start        # Production server
```

Via Turborepo:

```bash
pnpm turbo dev        # Starts all apps
pnpm turbo lint       # Lints all workspaces
pnpm turbo build      # Builds all workspaces
pnpm turbo typecheck  # Typechecks all workspaces
```

## Environment Variables

Set in `.env`:

- `PROVIDER_ID` — LLM provider (default: `anthropic`)
- `MODEL_ID` — Model ID (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_API_KEY` — API key for Anthropic (or use `<PROVIDER>_API_KEY` pattern)
- `PORT` — Server port (default: `8000`)

## API

### `GET /health`

Health check.

### `POST /explore`

Explore a codebase and generate a step-by-step user guide.

```json
{
  "git_url": "https://github.com/user/repo",
  "flow": "How to mark a message as unread"
}
```

Response:

```json
{
  "success": true,
  "guide": {
    "title": "How to Mark a Message as Unread",
    "steps": ["Step 1...", "Step 2...", "..."]
  }
}
```

## Structure

- `src/index.ts` — Hono app entrypoint, CORS, server startup
- `src/routes/explore.ts` — POST /explore handler
- `src/services/explorer.ts` — Clone repo + run AI agent exploration
- `src/services/structured-output.ts` — Custom submit_guide tool definition

## Conventions

- Run `pnpm lint && pnpm typecheck` before committing
- The `.env` file contains API keys — never commit secrets
