import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { flowsRoute } from "./routes/flows.js"
import { recordingsRoute } from "./routes/recordings.js"
import { settingsRoute } from "./routes/settings.js"

const app = new Hono()
  .use(logger())
  .use(
    "*",
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    })
  )
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/settings", settingsRoute)
  .route("/recordings", recordingsRoute)
  .route("/flows", flowsRoute)

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : "Internal server error"
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err)
  return c.json({ error: message }, 500)
})

export type AppType = typeof app
export { app }
