import { Hono } from "hono"
import { runExploration } from "../services/explorer.js"

export const exploreRoute = new Hono()

exploreRoute.post("/explore", async (c) => {
  const body = await c.req.json<{ git_url?: string; flow?: string }>()

  if (!body.git_url || !body.flow) {
    return c.json({ error: "git_url and flow are required" }, { status: 400 })
  }

  try {
    const guide = await runExploration(body.git_url, body.flow)
    return c.json({ success: true, guide })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return c.json({ success: false, error: message }, { status: 500 })
  }
})
