import { Hono } from "hono"
import { eq, desc } from "drizzle-orm"
import { db } from "../db/index.js"
import { flows } from "../db/schema.js"
import { runExploration } from "../services/explorer.js"
import { getSettings } from "./settings.js"
import { runDiscoveryCycle } from "../services/scheduler.js"

async function parseJsonBody<T>(c: import("hono").Context): Promise<T> {
  try {
    return await c.req.json<T>()
  } catch {
    throw new Error("Invalid JSON body")
  }
}

export const flowsRoute = new Hono()
  .post("/", async (c) => {
    const body = await parseJsonBody<{ name?: string; description?: string }>(c)

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

    ;(async () => {
      try {
        await db
          .update(flows)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(flows.id, row.id))

        const { guide, userDocs } = await runExploration(gitUrl, flowDescription)

        await db
          .update(flows)
          .set({ status: "completed", guide, userDocs, updatedAt: new Date() })
          .where(eq(flows.id, row.id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await db
          .update(flows)
          .set({ status: "failed", error: message, updatedAt: new Date() })
          .where(eq(flows.id, row.id))
      }
    })()

    return c.json({ id: row.id, status: row.status } as const, 201)
  })
  .get("/", async (c) => {
    const all = await db.select().from(flows).orderBy(desc(flows.createdAt))
    return c.json(all)
  })
  .put("/:id", async (c) => {
    const id = c.req.param("id")
    const body = await parseJsonBody<{ guide?: string; userDocs?: string }>(c)

    if (!body.guide && !body.userDocs) {
      return c.json({ error: "guide or userDocs is required" } as const, 400)
    }

    const [existing] = await db.select().from(flows).where(eq(flows.id, id))
    if (!existing) return c.json({ error: "Flow not found" } as const, 404)

    const [row] = await db
      .update(flows)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(flows.id, id))
      .returning()

    return c.json(row)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = await db.select().from(flows).where(eq(flows.id, id))
    if (!row) return c.json({ error: "Flow not found" } as const, 404)
    return c.json(row)
  })
  .post("/discover", async (c) => {
    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured. PUT /settings first." } as const, 400)
    }

    runDiscoveryCycle().catch((err) => {
      console.error("[discover] Discovery failed:", err)
    })

    return c.json({ status: "discovery_started" } as const, 202)
  })
  .post("/:id/approve", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" } as const, 404)
    if (existing.status !== "pending_approval") {
      return c.json({ error: "Flow is not in pending_approval status" } as const, 400)
    }

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured" } as const, 400)
    }

    await db
      .update(flows)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(flows.id, id))

    ;(async () => {
      try {
        await db
          .update(flows)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(flows.id, id))

        const { guide, userDocs } = await runExploration(
          settings.gitUrl,
          existing.description
        )

        await db
          .update(flows)
          .set({ status: "completed", guide, userDocs, error: null, updatedAt: new Date() })
          .where(eq(flows.id, id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await db
          .update(flows)
          .set({ status: "failed", error: message, updatedAt: new Date() })
          .where(eq(flows.id, id))
      }
    })()

    return c.json({ id, status: "pending" } as const, 200)
  })
  .post("/:id/re-explore", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" } as const, 404)
    if (existing.status !== "needs_update") {
      return c.json({ error: "Flow is not in needs_update status" } as const, 400)
    }

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured" } as const, 400)
    }

    ;(async () => {
      try {
        await db
          .update(flows)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(flows.id, id))

        const { guide, userDocs } = await runExploration(
          settings.gitUrl,
          existing.description
        )

        await db
          .update(flows)
          .set({ status: "completed", guide, userDocs, error: null, updatedAt: new Date() })
          .where(eq(flows.id, id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await db
          .update(flows)
          .set({ status: "failed", error: message, updatedAt: new Date() })
          .where(eq(flows.id, id))
      }
    })()

    return c.json({ id, status: "running" } as const, 200)
  })
  .post("/:id/dismiss", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" } as const, 404)
    if (existing.status !== "needs_update") {
      return c.json({ error: "Flow is not in needs_update status" } as const, 400)
    }

    const [row] = await db
      .update(flows)
      .set({ status: "completed", error: null, updatedAt: new Date() })
      .where(eq(flows.id, id))
      .returning()

    return c.json(row)
  })
  .post("/:id/flag", async (c) => {
    const id = c.req.param("id")
    const body = await parseJsonBody<{ reason?: string }>(c)
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" } as const, 404)
    if (existing.status !== "completed") {
      return c.json({ error: "Only completed flows can be flagged" } as const, 400)
    }

    const [row] = await db
      .update(flows)
      .set({ status: "needs_update", error: body.reason ?? "Manually flagged for review", updatedAt: new Date() })
      .where(eq(flows.id, id))
      .returning()

    return c.json(row)
  })
