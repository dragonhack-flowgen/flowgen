import { Hono } from "hono"
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

export const settingsRoute = new Hono()
  .get("/", async (c) => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: row?.gitUrl ?? null, demoUrl: row?.demoUrl ?? null, lastExploredCommit: row?.lastExploredCommit ?? null } as const)
  })
  .put("/", async (c) => {
    let body: { gitUrl?: string; git_url?: string; demoUrl?: string; demo_url?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" } as const, 400)
    }
    const gitUrl = body.gitUrl ?? body.git_url
    const demoUrl = body.demoUrl ?? body.demo_url

    if (!gitUrl) {
      return c.json({ error: "Git URL is required" } as const, 400)
    }
    if (!isSupportedGitUrl(gitUrl)) {
      return c.json(
        {
          error:
            "Git URL must be a public GitHub or GitLab HTTPS repository URL.",
        } as const,
        400
      )
    }

    if (demoUrl !== undefined && demoUrl !== null && demoUrl.trim() !== "") {
      try {
        const url = new URL(demoUrl)
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return c.json({ error: "Demo URL must be a valid HTTP or HTTPS URL." } as const, 400)
        }
      } catch {
        return c.json({ error: "Demo URL must be a valid HTTP or HTTPS URL." } as const, 400)
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

    return c.json({ gitUrl: normalizedGitUrl, demoUrl: normalizedDemoUrl } as const)
  })
  .delete("/", async (c) => {
    await db.delete(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: null } as const)
  })

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
}
