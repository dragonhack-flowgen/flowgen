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
    return c.json({
      gitUrl: row?.gitUrl ?? null,
      lastExploredCommit: row?.lastExploredCommit ?? null,
    })
  })
  .put("/", zValidator("json", updateSettingsSchema), async (c) => {
    const { gitUrl } = c.req.valid("json")
    const normalizedGitUrl = normalizeGitUrl(gitUrl)

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))

    if (existing) {
      await db
        .update(settings)
        .set({ gitUrl: normalizedGitUrl, updatedAt: new Date() })
        .where(eq(settings.id, 1))
    } else {
      await db.insert(settings).values({ id: 1, gitUrl: normalizedGitUrl })
    }

    return c.json({ gitUrl: normalizedGitUrl })
  })
  .delete("/", async (c) => {
    await db.delete(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: null })
  })

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
}
