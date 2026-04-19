import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { UTApi } from "uploadthing/server"
import { db } from "../db/index.js"
import { recordings } from "../db/schema.js"

const internalSecret = process.env.INTERNAL_API_SECRET || "flowgen-internal-dev-secret"
const uploadthingToken = process.env.UPLOADTHING_TOKEN
const uploadthingAcl = process.env.UPLOADTHING_ACL as "public-read" | "private" | undefined

const utapi = uploadthingToken ? new UTApi({ token: uploadthingToken }) : null

function requireInternalSecret(c: import("hono").Context) {
  const secret = c.req.header("x-internal-api-secret")
  if (secret !== internalSecret) {
    return c.json({ error: "Unauthorized" } as const, 401)
  }
  return null
}

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
    if (!row) return c.json({ error: "Recording not found" } as const, 404)
    return c.json(row)
  })
  .post("/internal/upload", async (c) => {
    const unauthorized = requireInternalSecret(c)
    if (unauthorized) return unauthorized
    if (!utapi) {
      return c.json({ error: "UPLOADTHING_TOKEN is not configured" } as const, 500)
    }

    const formData = await c.req.formData()
    const taskId = formData.get("taskId")
    const task = formData.get("task")
    const file = formData.get("file")

    if (typeof taskId !== "string" || !taskId.trim()) {
      return c.json({ error: "taskId is required" } as const, 400)
    }
    if (!(file instanceof File)) {
      return c.json({ error: "file is required" } as const, 400)
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
          manifest: null,
          updatedAt: new Date(),
        })
      }

      return c.json({ error: message } as const, 500)
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
        manifest: null,
        error: null,
        updatedAt: new Date(),
      })
    }

    return c.json(artifacts)
  })
