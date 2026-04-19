import "dotenv/config"
import { serve } from "@hono/node-server"
import { initDb } from "./db/index.js"
import { app } from "./app.js"
import { startScheduler } from "./services/scheduler.js"

const port = Number(process.env.PORT) || 8001

await initDb()

startScheduler()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
