import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { db } from "../db/index.js"
import { flows } from "../db/schema.js"
import { runExploration } from "../services/explorer.js"
import { getSettings } from "./settings.js"
import { runDiscoveryCycle } from "../services/scheduler.js"

const createFlowSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().min(1, "description is required"),
})

const updateFlowSchema = z
  .object({
    guide: z.string().optional(),
    userDocs: z.string().optional(),
  })
  .refine((data) => data.guide || data.userDocs, {
    message: "guide or userDocs is required",
  })

const flagFlowSchema = z.object({
  reason: z.string().optional(),
})

export const flowsRoute = new Hono()
  .post("/", zValidator("json", createFlowSchema), async (c) => {
    const body = c.req.valid("json")

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured. PUT /settings first." }, 400)
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

    return c.json({ id: row.id, status: row.status }, 201)
  })
  .get("/", async (c) => {
    const all = await db.select().from(flows).orderBy(desc(flows.createdAt))
    return c.json(all)
  })
  .put("/:id", zValidator("json", updateFlowSchema), async (c) => {
    const id = c.req.param("id")
    const body = c.req.valid("json")

    const [existing] = await db.select().from(flows).where(eq(flows.id, id))
    if (!existing) return c.json({ error: "Flow not found" }, 404)

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
    if (!row) return c.json({ error: "Flow not found" }, 404)
    return c.json(row)
  })
  .post("/discover", async (c) => {
    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured. PUT /settings first." }, 400)
    }

    runDiscoveryCycle().catch((err) => {
      console.error("[discover] Discovery failed:", err)
    })

    return c.json({ status: "discovery_started" }, 202)
  })
  .post("/:id/approve", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" }, 404)
    if (existing.status !== "pending_approval") {
      return c.json({ error: "Flow is not in pending_approval status" }, 400)
    }

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured" }, 400)
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

    return c.json({ id, status: "pending" }, 200)
  })
  .post("/:id/re-explore", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" }, 404)
    if (existing.status !== "needs_update") {
      return c.json({ error: "Flow is not in needs_update status" }, 400)
    }

    const settings = await getSettings()
    if (!settings) {
      return c.json({ error: "Settings not configured" }, 400)
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

    return c.json({ id, status: "running" }, 200)
  })
  .post("/:id/dismiss", async (c) => {
    const id = c.req.param("id")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" }, 404)
    if (existing.status !== "needs_update") {
      return c.json({ error: "Flow is not in needs_update status" }, 400)
    }

    const [row] = await db
      .update(flows)
      .set({ status: "completed", error: null, updatedAt: new Date() })
      .where(eq(flows.id, id))
      .returning()

    return c.json(row)
  })
  .post("/:id/flag", zValidator("json", flagFlowSchema), async (c) => {
    const id = c.req.param("id")
    const body = c.req.valid("json")
    const [existing] = await db.select().from(flows).where(eq(flows.id, id))

    if (!existing) return c.json({ error: "Flow not found" }, 404)
    if (existing.status !== "completed") {
      return c.json({ error: "Only completed flows can be flagged" }, 400)
    }

    const [row] = await db
      .update(flows)
      .set({ status: "needs_update", error: body.reason ?? "Manually flagged for review", updatedAt: new Date() })
      .where(eq(flows.id, id))
      .returning()

    return c.json(row)
  })
