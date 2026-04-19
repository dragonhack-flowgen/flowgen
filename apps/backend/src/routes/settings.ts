import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { settings } from "../db/schema.js"

export const settingsRoute = new Hono()
  .get("/", async (c) => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: row?.gitUrl ?? null, lastExploredCommit: row?.lastExploredCommit ?? null } as const)
  })
  .put("/", async (c) => {
    let body: { gitUrl?: string; git_url?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" } as const, 400)
    }
    const gitUrl = body.gitUrl ?? body.git_url

    if (!gitUrl) {
      return c.json({ error: "Git URL is required" } as const, 400)
    }

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))

    if (existing) {
      await db
        .update(settings)
        .set({ gitUrl, updatedAt: new Date() })
        .where(eq(settings.id, 1))
    } else {
      await db.insert(settings).values({ id: 1, gitUrl })
    }

    return c.json({ gitUrl } as const)
  })

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
}
