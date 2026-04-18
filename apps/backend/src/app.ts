import { cors } from "hono/cors"
import { Hono } from "hono"
import { flowsRoute } from "./routes/flows.js"
import { settingsRoute } from "./routes/settings.js"

const app = new Hono()
  .use("*", cors())
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/settings", settingsRoute)
  .route("/flows", flowsRoute)

export type AppType = typeof app
export { app }
