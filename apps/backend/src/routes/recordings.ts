import { Hono } from "hono"
import { desc, eq } from "drizzle-orm"
import { readFile } from "node:fs/promises"
import { db } from "../db/index.js"
import { recordings, type Recording } from "../db/schema.js"
import {
  getInternalApiSecret,
  getRecorderConfig,
  runRecording,
  uploadRecordingFileToUploadThing,
} from "../services/recordings.js"
import type {
  CreateRecordingRequest,
  CreateRecordingResponse,
  RecordingArtifacts,
  RecordingLinks,
  RecordingResponse,
} from "../types/recordings.js"

function isCreateRecordingRequest(value: unknown): value is CreateRecordingRequest {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const task = Reflect.get(value, "task")
  return typeof task === "string" && task.trim().length > 0
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function getBaseUrl(requestUrl: string): string {
  const config = getRecorderConfig()
  return config.appBaseUrl ?? new URL(requestUrl).origin
}

function isAuthorizedInternalRequest(request: Request): boolean {
  const secret = request.headers.get("x-internal-api-secret")
  return secret === getInternalApiSecret()
}

function buildRecordingLinks(recording: Recording, requestUrl: string): RecordingLinks {
  const artifacts = recording.artifacts
  const uploadThingUrl = artifacts?.uploadUrl ?? null
  const videoUrl =
    uploadThingUrl ?? `${getBaseUrl(requestUrl)}/recordings/${recording.id}/video`

  return {
    videoUrl,
    downloadUrl: videoUrl,
    liveUrl: null,
  }
}

function toRecordingResponse(
  recording: Recording,
  requestUrl: string
): RecordingResponse {
  const links = buildRecordingLinks(recording, requestUrl)

  return {
    id: recording.id,
    task: recording.task,
    providerTaskId: recording.providerTaskId ?? null,
    status: recording.status,
    artifacts: recording.artifacts ?? null,
    manifest: recording.manifest ?? null,
    error: recording.error ?? null,
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt,
    videoUrl: links.videoUrl,
    downloadUrl: links.downloadUrl,
    liveUrl: links.liveUrl,
  }
}

export const recordingsRoute = new Hono()
  .post("/internal/upload", async (c) => {
    if (!isAuthorizedInternalRequest(c.req.raw)) {
      return c.json({ error: "Unauthorized" } as const, 401)
    }

    const formData = await c.req.raw.formData()
    const taskIdValue = formData.get("taskId")
    const fileValue = formData.get("file")
    if (typeof taskIdValue !== "string" || taskIdValue.trim() === "") {
      return c.json({ error: "taskId is required" } as const, 400)
    }
    if (!(fileValue instanceof File)) {
      return c.json({ error: "file is required" } as const, 400)
    }

    const bytes = new Uint8Array(await fileValue.arrayBuffer())
    const artifacts: RecordingArtifacts = await uploadRecordingFileToUploadThing(
      taskIdValue.trim(),
      fileValue.name || "recording.mp4",
      bytes
    )
    return c.json(artifacts)
  })
  .post("/", async (c) => {
    const body = await readJsonBody(c.req.raw)
    if (!isCreateRecordingRequest(body)) {
      return c.json({ error: "task is required" } as const, 400)
    }

    const [row] = await db
      .insert(recordings)
      .values({
        task: body.task.trim(),
        status: "pending",
      })
      .returning()

    console.log("[recordings] Created recording job", {
      id: row.id,
      task: row.task,
    })

    const recording = (async () => {
      try {
        console.log("[recordings] Marking job as running", { id: row.id })
        await db
          .update(recordings)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(recordings.id, row.id))

        const result = await runRecording({
          taskId: row.id,
          task: row.task,
        })

        console.log("[recordings] Recording job completed", {
          id: row.id,
          sessionId: result.manifest.sessionId,
        })
        await db
          .update(recordings)
          .set({
            providerTaskId: result.providerTaskId,
            status: "completed",
            artifacts: result.artifacts,
            manifest: result.manifest,
            updatedAt: new Date(),
          })
          .where(eq(recordings.id, row.id))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown recording error"
        console.error("[recordings] Recording job failed", {
          id: row.id,
          error: message,
        })
        await db
          .update(recordings)
          .set({
            status: "failed",
            error: message,
            updatedAt: new Date(),
          })
          .where(eq(recordings.id, row.id))
      }
    })()

    recording.catch(() => {})

    const response: CreateRecordingResponse = {
      id: row.id,
      status: row.status,
    }
    return c.json(response, 201)
  })
  .get("/", async (c) => {
    const all = await db
      .select()
      .from(recordings)
      .orderBy(desc(recordings.createdAt))
    return c.json(all.map((row) => toRecordingResponse(row, c.req.url)))
  })
  .get("/:id/video", async (c) => {
    const id = c.req.param("id")
    const [row] = await db.select().from(recordings).where(eq(recordings.id, id))
    if (!row) {
      return c.json({ error: "Recording not found" } as const, 404)
    }

    const artifacts = row.artifacts
    if (!artifacts) {
      return c.json({ error: "Recording is not ready yet" } as const, 404)
    }

    if (artifacts.provider === "uploadthing" && artifacts.fileKey !== null) {
      if (artifacts.acl === "private") {
        const config = getRecorderConfig()
        if (config.uploadThingToken === null) {
          return c.json({ error: "UploadThing token is not configured" } as const, 500)
        }

        const { UTApi } = await import("uploadthing/server")
        const utapi = new UTApi({ token: config.uploadThingToken })
        const signedUrl = await utapi.generateSignedURL(artifacts.fileKey, {
          expiresIn: config.uploadThingSignedUrlTtlSeconds,
        })
        return c.redirect(signedUrl.ufsUrl, 302)
      }

      if (artifacts.uploadUrl !== null) {
        return c.redirect(artifacts.uploadUrl, 302)
      }
    }

    if (artifacts.localPath !== null) {
      const video = await readFile(artifacts.localPath)
      c.header("content-type", "video/mp4")
      c.header(
        "content-disposition",
        `inline; filename="${row.id}-${artifacts.localPath.split("/").pop() ?? "recording.mp4"}"`
      )
      return c.body(video)
    }

    return c.json({ error: "Recording video is not available" } as const, 404)
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = await db.select().from(recordings).where(eq(recordings.id, id))
    if (!row) {
      return c.json({ error: "Recording not found" } as const, 404)
    }
    return c.json(toRecordingResponse(row, c.req.url))
  })
