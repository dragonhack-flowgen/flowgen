import { Hono } from "hono"
import { createMiddleware } from "hono/factory"
import { desc, eq } from "drizzle-orm"
import { UTApi } from "uploadthing/server"
import { db } from "../db/index.js"
import { recordings } from "../db/schema.js"

const internalSecret = process.env.INTERNAL_API_SECRET || "flowgen-internal-dev-secret"
const uploadthingToken = process.env.UPLOADTHING_TOKEN
const uploadthingAcl = process.env.UPLOADTHING_ACL as "public-read" | "private" | undefined

const utapi = uploadthingToken ? new UTApi({ token: uploadthingToken }) : null

const requireInternalSecret = createMiddleware(async (c, next) => {
  const secret = c.req.header("x-internal-api-secret")
  if (secret !== internalSecret) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  await next()
})

export const recordingsRoute = new Hono()
  .get("/", async (c) => {
    const rows = await db.select().from(recordings).orderBy(desc(recordings.createdAt))
    return c.json(rows)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.providerTaskId, id))
    if (!row) return c.json({ error: "Recording not found" }, 404)
    return c.json(row)
  })
  .post("/internal/upload", requireInternalSecret, async (c) => {
    if (!utapi) {
      return c.json({ error: "UPLOADTHING_TOKEN is not configured" }, 500)
    }

    const formData = await c.req.formData()
    const taskId = formData.get("taskId")
    const task = formData.get("task")
    const file = formData.get("file")
    const manifestInput = formData.get("manifest")
    let manifest: unknown = null

    if (typeof manifestInput === "string" && manifestInput.trim()) {
      try {
        manifest = JSON.parse(manifestInput)
      } catch {
        return c.json({ error: "manifest must be valid JSON" } as const, 400)
      }
    }

    if (typeof taskId !== "string" || !taskId.trim()) {
      return c.json({ error: "taskId is required" }, 400)
    }
    if (!(file instanceof File)) {
      return c.json({ error: "file is required" }, 400)
    }

    const result = await utapi.uploadFiles(
      file,
      uploadthingAcl ? { acl: uploadthingAcl } : undefined,
    )

    if (result.error || !result.data) {
      const message = result.error?.message || "UploadThing upload failed"
      const [existing] = await db
        .select()
        .from(recordings)
        .where(eq(recordings.providerTaskId, taskId.trim()))

      if (existing) {
        await db
          .update(recordings)
          .set({
            task: typeof task === "string" ? task : existing.task,
            status: "failed",
            error: message,
            manifest,
            updatedAt: new Date(),
          })
          .where(eq(recordings.id, existing.id))
      } else {
        await db.insert(recordings).values({
          task: typeof task === "string" ? task : taskId.trim(),
          providerTaskId: taskId.trim(),
          status: "failed",
          error: message,
          artifacts: null,
          manifest,
          updatedAt: new Date(),
        })
      }

      return c.json({ error: message }, 500)
    }

    const artifacts = {
      provider: "uploadthing",
      acl: uploadthingAcl || null,
      fileKey: result.data.key,
      uploadUrl: result.data.ufsUrl,
      error: null,
    }

    const [existing] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.providerTaskId, taskId.trim()))

    if (existing) {
      await db
        .update(recordings)
        .set({
          task: typeof task === "string" ? task : existing.task,
          status: "completed",
          artifacts,
          manifest,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(recordings.id, existing.id))
    } else {
      await db.insert(recordings).values({
        task: typeof task === "string" ? task : taskId.trim(),
        providerTaskId: taskId.trim(),
        status: "completed",
        artifacts,
        manifest,
        error: null,
        updatedAt: new Date(),
      })
    }

    return c.json(artifacts)
  })
