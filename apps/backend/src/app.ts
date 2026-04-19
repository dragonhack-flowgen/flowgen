import { cors } from "hono/cors"
import { Hono } from "hono"
import { flowsRoute } from "./routes/flows.js"
import { settingsRoute } from "./routes/settings.js"

const app = new Hono()
  .use("*", cors())
  .use("*", async (c, next) => {
    try {
      await next()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error"
      return c.json({ error: message } as const, 500)
    }
  })
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/settings", settingsRoute)
  .route("/flows", flowsRoute)

export type AppType = typeof app
export { app }
