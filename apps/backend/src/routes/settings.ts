import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { settings } from "../db/schema.js"

export const settingsRoute = new Hono()
  .get("/", async (c) => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1))
    return c.json({ gitUrl: row?.gitUrl ?? null } as const)
  })
  .put("/", async (c) => {
    const body = await c.req.json<{ git_url?: string }>()

    if (!body.git_url) {
      return c.json({ error: "git_url is required" } as const, 400)
    }

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))

    if (existing) {
      await db
        .update(settings)
        .set({ gitUrl: body.git_url, updatedAt: new Date() })
        .where(eq(settings.id, 1))
    } else {
      await db.insert(settings).values({ id: 1, gitUrl: body.git_url })
    }

    return c.json({ gitUrl: body.git_url } as const)
  })

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
}
