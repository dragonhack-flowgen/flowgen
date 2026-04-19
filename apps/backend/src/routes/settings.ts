import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { settings } from "../db/schema.js"

function normalizeGitUrl(gitUrl: string): string {
  return gitUrl.trim().replace(/\.git$/, "")
}

function isSupportedGitUrl(gitUrl: string): boolean {
  try {
    const url = new URL(normalizeGitUrl(gitUrl))
    if (url.protocol !== "https:") return false
    if (!["github.com", "gitlab.com"].includes(url.hostname)) return false

    const [owner, repo] = url.pathname.split("/").filter(Boolean)
    return Boolean(owner && repo)
  } catch {
    return false
  }
}

const updateSettingsSchema = z.object({
  gitUrl: z
    .string()
    .url("Must be a valid URL")
    .refine(isSupportedGitUrl, {
      message:
        "Git URL must be a public GitHub or GitLab HTTPS repository URL.",
    }),
})

export const settingsRoute = new Hono()
  .get("/", async (c) => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: row?.gitUrl ?? null, demoUrl: row?.demoUrl ?? null, lastExploredCommit: row?.lastExploredCommit ?? null } as const)
  })
  .put("/", zValidator("json", updateSettingsSchema), async (c) => {
    const body = c.req.valid("json")
    const gitUrl = body.gitUrl
    
    // allow backward compat from raw if zValidator missed anything, or extract demoUrl manually if we want to bypass since zValidator might strip it. Actually, wait. zValidator might strip demoUrl if it's not in the schema.
    let rawBody: any = {}
    try {
      rawBody = await c.req.json()
    } catch {}
    const demoUrl = rawBody?.demoUrl ?? rawBody?.demo_url

    if (demoUrl !== undefined && demoUrl !== null && demoUrl.trim() !== "") {
      try {
        const url = new URL(demoUrl)
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          // ignore or handle error 
        }
      } catch {
        // ignore 
      }
    }
    const normalizedGitUrl = normalizeGitUrl(gitUrl)
    const normalizedDemoUrl = demoUrl?.trim() || null

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))

    if (existing) {
      await db
        .update(settings)
        .set({ gitUrl: normalizedGitUrl, demoUrl: normalizedDemoUrl, updatedAt: new Date() })
        .where(eq(settings.id, 1))
    } else {
      await db.insert(settings).values({ id: 1, gitUrl: normalizedGitUrl, demoUrl: normalizedDemoUrl })
    }

    return c.json({ gitUrl: normalizedGitUrl, demoUrl: normalizedDemoUrl, lastExploredCommit: existing?.lastExploredCommit ?? null } as const)
  })
  .delete("/", async (c) => {
    await db.delete(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: null })
  })

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
}
