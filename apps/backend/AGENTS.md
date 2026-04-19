# Backend (Hono + pi-coding-agent)

TypeScript backend using Hono on Node.js with the pi-coding-agent SDK for AI-powered codebase exploration.

## Commands

Run from this directory (`apps/backend/`) or via Turborepo from repo root.

```bash
pnpm dev          # Dev server with hot reload (port 8001)
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
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Server port (default: `8001`)

## API

### `GET /health`

Health check. Returns `{ status: "ok" }`.

### Settings

#### `GET /settings`

Returns current settings.

Response:
```json
{ "gitUrl": "https://github.com/user/repo" }
```

#### `PUT /settings`

Upsert settings.

Body:
```json
{ "gitUrl": "https://github.com/user/repo" }
```

### Flows

#### `POST /flows`

Create a new flow and trigger async AI exploration.

Body:
```json
{ "name": "My flow", "description": "How to mark a message as unread" }
```

Response (201):
```json
{ "id": "uuid", "status": "pending" }
```

#### `GET /flows`

List all flows, ordered by creation date descending.

#### `GET /flows/:id`

Get a single flow by ID.

#### `PUT /flows/:id`

Update flow guide or user docs.

Body:
```json
{ "guide": "...", "userDocs": "..." }
```

## Structure

- `src/index.ts` — Server entrypoint, DB init, starts Hono server
- `src/app.ts` — Hono app with CORS, health check, mounted sub-routers
- `src/db/index.ts` — Database client (drizzle-orm + postgres.js)
- `src/db/schema.ts` — Drizzle schema (flows, settings tables)
- `src/routes/settings.ts` — GET/PUT /settings handlers + getSettings helper
- `src/routes/flows.ts` — CRUD /flows handlers with async exploration
- `src/services/explorer.ts` — Clone repo + run AI agent exploration
- `src/services/structured-output.ts` — Custom submit_guide tool definition

## Conventions

- Run `pnpm lint && pnpm typecheck` before committing
- The `.env` file contains API keys — never commit secrets
