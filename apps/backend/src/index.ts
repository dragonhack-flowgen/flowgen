import "dotenv/config"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { Hono } from "hono"
import { exploreRoute } from "./routes/explore.js"

const app = new Hono()

app.use("*", cors())

app.get("/health", (c) => c.json({ status: "ok" }))

app.route("/", exploreRoute)

const port = Number(process.env.PORT) || 8000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
