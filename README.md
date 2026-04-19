# Flowgen

This repo now runs recordings through a headless Python Browser Use service instead of the TypeScript `browser-use-sdk`.

## Services

- `apps/backend`: Hono API used by the frontend and the source of truth for recording status.
- `apps/web`: Vite frontend.
- `apps/recorder-api`: Python Browser Use runner, FastAPI app, and Docker packaging for the recorder service.

## Recording Flow

1. The frontend creates a job with `POST /recordings`.
2. The backend stores a `pending` row, moves it to `running`, and calls the Python recorder service at `POST /recordings/run`.
3. The Python service runs Browser Use headlessly, then saves:
   - `task_record.json`
   - `agent_history.json`
   - raw MP4 recording
   - optional conversation and step-trace files
4. The backend uploads the raw MP4 to UploadThing when `RECORDING_STORAGE_MODE=uploadthing`.
5. The backend stores the UploadThing metadata and manifest in Postgres, then the frontend keeps polling the existing backend routes for status.

## Runtime Config

Root `.env`:

This stays at the repo root on purpose so both the backend and the recorder container share one config source.

- Required:
  - `DATABASE_URL`
  - `APP_BASE_URL=http://localhost:8001`
  - `PORT=8001`
  - `PYTHON_RECORDER_URL=http://localhost:8002`
  - `BACKEND_INTERNAL_URL=http://localhost:8001`
  - `INTERNAL_API_SECRET`
  - `RECORDING_STORAGE_MODE=local` or `uploadthing`
  - `OPENAI_API_KEY` and/or `BROWSER_USE_API_KEY`
  - `BROWSER_USE_MODEL_PROVIDER`
  - `BROWSER_USE_MODEL`
- Required when `RECORDING_STORAGE_MODE=uploadthing`:
  - `UPLOADTHING_TOKEN`
  - `UPLOADTHING_ACL`
- Recommended Browser Use settings:
  - `BROWSER_USE_HEADLESS=true`
  - `BROWSER_USE_HIGHLIGHT_ELEMENTS=true`
  - `BROWSER_USE_DOM_HIGHLIGHT_ELEMENTS=false`
  - `BROWSER_USE_RECORD_VIDEO=true`
  - `BROWSER_USE_RECORD_VIDEO_WIDTH=1600`
  - `BROWSER_USE_RECORD_VIDEO_HEIGHT=900`
  - `BROWSER_USE_RECORD_VIDEO_FPS=30`
  - `BROWSER_USE_TASK_RECORDS_DIR=task_records`
  - `BROWSER_USE_CONVERSATIONS_DIR=conversations`
  - `BROWSER_USE_STEP_TRACES_DIR=step_traces`

Example setup:

```bash
cp .env.example .env
```

Then edit `.env` and fill in at least:

```env
DATABASE_URL=postgres://flowgen:flowgen@localhost:5432/flowgen
APP_BASE_URL=http://localhost:8001
PYTHON_RECORDER_URL=http://localhost:8002
BACKEND_INTERNAL_URL=http://localhost:8001
INTERNAL_API_SECRET=change-me
PORT=8001

RECORDING_STORAGE_MODE=uploadthing
UPLOADTHING_TOKEN=your-uploadthing-token
UPLOADTHING_ACL=public-read

OPENAI_API_KEY=your-openai-key
BROWSER_USE_MODEL_PROVIDER=openai
BROWSER_USE_MODEL=gpt-5.4-mini
BROWSER_USE_HEADLESS=true
BROWSER_USE_RECORD_VIDEO=true
```

## Local Dev

1. Create your local env:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
docker compose up -d postgres recorder-api
```

3. Start the monorepo apps:

```bash
pnpm dev
```

This gives you:

- backend API on `http://localhost:8001`
- Python recorder service on `http://localhost:8002`

The frontend should keep talking only to the backend. Video delivery stays on `/recordings/:id/video`; in `local` mode the backend streams the raw MP4, and in `uploadthing` mode it redirects to UploadThing.

## Recording API

Create a recording job:

```bash
curl -X POST http://localhost:8001/recordings \
  -H 'Content-Type: application/json' \
  -d '{"task":"Open https://example.com and tell me the page title"}'
```

Example response:

```json
{
  "id": "e6b77733-f277-4a8f-9e68-1cb90d554ac0",
  "status": "pending"
}
```

Poll a single recording:

```bash
curl http://localhost:8001/recordings/e6b77733-f277-4a8f-9e68-1cb90d554ac0
```

List recent recordings:

```bash
curl http://localhost:8001/recordings
```

Fetch the video endpoint:

```bash
curl -I http://localhost:8001/recordings/e6b77733-f277-4a8f-9e68-1cb90d554ac0/video
```

What the backend returns after completion:

- `status`: `completed` or `failed`
- `providerTaskId`: the Python recorder run id
- `artifacts.uploadUrl`: UploadThing URL when upload mode succeeds
- `videoUrl`: public/backend-served video URL for the frontend
- `manifest`: timeline and metadata for the run
- `error`: failure message when the run fails

Internal routes:

- `POST /recordings/internal/upload` is backend-internal only
- `POST /recordings/run` is Python-service internal only

Your frontend or external client should only call:

- `POST /recordings`
- `GET /recordings`
- `GET /recordings/:id`
- `GET /recordings/:id/video`
