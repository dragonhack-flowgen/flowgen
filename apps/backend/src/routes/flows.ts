import { Hono } from "hono"
import { eq, desc } from "drizzle-orm"
import { db } from "../db/index.js"
import { flows } from "../db/schema.js"
import { runExploration } from "../services/explorer.js"
import { getSettings } from "./settings.js"

export const flowsRoute = new Hono()
  .post("/", async (c) => {
    const body = await c.req.json<{ name?: string; description?: string }>()

    if (!body.name || !body.description) {
      return c.json({ error: "name and description are required" } as const, 400)
    }

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured. PUT /settings first." } as const, 400)
    }

    const flowDescription = body.description
    const gitUrl = settings.gitUrl

    const [row] = await db
      .insert(flows)
      .values({
        name: body.name,
        description: flowDescription,
        status: "pending",
      })
      .returning()

    const exploration = (async () => {
      try {
        await db
          .update(flows)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(flows.id, row.id))

        const guide = await runExploration(gitUrl, flowDescription)

        await db
          .update(flows)
          .set({ status: "completed", guide, updatedAt: new Date() })
          .where(eq(flows.id, row.id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await db
          .update(flows)
          .set({ status: "failed", error: message, updatedAt: new Date() })
          .where(eq(flows.id, row.id))
      }
    })()
    exploration.catch(() => {})

    return c.json({ id: row.id, status: row.status } as const, 201)
  })
  .get("/", async (c) => {
    const all = await db.select().from(flows).orderBy(desc(flows.createdAt))
    return c.json(all)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = await db.select().from(flows).where(eq(flows.id, id))
    if (!row) return c.json({ error: "Flow not found" } as const, 404)
    return c.json(row)
  })
