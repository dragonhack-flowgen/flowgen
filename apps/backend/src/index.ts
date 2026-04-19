import "dotenv/config"
import { serve } from "@hono/node-server"
import { initDb } from "./db/index.js"
import { app } from "./app.js"

const port = Number(process.env.PORT) || 8001

await initDb()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
