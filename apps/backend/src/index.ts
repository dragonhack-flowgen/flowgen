import { serve } from "@hono/node-server"
import { initDb } from "./db/index.js"
import { app } from "./app.js"
import { startScheduler, stopScheduler } from "./services/scheduler.js"

const port = Number(process.env.PORT) || 8001

await initDb()

startScheduler()

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})

process.on("SIGINT", () => {
  stopScheduler()
  server.close()
  process.exit(0)
})
process.on("SIGTERM", () => {
  stopScheduler()
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})
