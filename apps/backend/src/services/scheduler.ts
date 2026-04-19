import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { flows, settings } from "../db/schema.js"
import { runDiscovery } from "../services/discoverer.js"
import { getSettings } from "../routes/settings.js"

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
let intervalHandle: ReturnType<typeof setInterval> | null = null

export async function runDiscoveryCycle(): Promise<void> {
  console.log("[scheduler] Starting discovery cycle...")
  try {
    const settingsRow = await getSettings()
    if (!settingsRow?.gitUrl) {
      console.log("[scheduler] No git URL configured, skipping discovery")
      return
    }

    if (!settingsRow.lastExploredCommit) {
      console.log(
        "[scheduler] No last explored commit, setting to current HEAD"
      )
      const {
        cloneOrUpdateRepo,
        getHeadCommit,
      } = await import("../services/explorer.js")
      const repoPath = await cloneOrUpdateRepo(settingsRow.gitUrl)
      const headCommit = await getHeadCommit(repoPath)
      await db
        .update(settings)
        .set({ lastExploredCommit: headCommit, updatedAt: new Date() })
        .where(eq(settings.id, 1))
      console.log(`[scheduler] Set last explored commit to ${headCommit}`)
      return
    }

    const existingFlows = await db
      .select({ name: flows.name, description: flows.description })
      .from(flows)

    const { result, headCommit } = await runDiscovery(
      settingsRow.gitUrl,
      settingsRow.lastExploredCommit,
      existingFlows
    )

    const newFlowNames = new Set(result.newFlows.map((f) => f.name.toLowerCase()))

    for (const flow of result.newFlows) {
      await db.insert(flows).values({
        name: flow.name,
        description: flow.description,
        status: "pending_approval",
      })
      console.log(`[scheduler] Inserted new flow: "${flow.name}"`)
    }

    for (const changed of result.changedFlows) {
      if (newFlowNames.has(changed.existingFlowName.toLowerCase())) continue

      const [existing] = await db
        .select()
        .from(flows)
        .where(eq(flows.name, changed.existingFlowName))
        .limit(1)

      if (existing) {
        await db
          .update(flows)
          .set({ status: "needs_update", error: changed.reason, updatedAt: new Date() })
          .where(eq(flows.id, existing.id))
        console.log(
          `[scheduler] Marked flow "${changed.existingFlowName}" as needs_update: ${changed.reason}`
        )
      }
    }

    await db
      .update(settings)
      .set({ lastExploredCommit: headCommit, updatedAt: new Date() })
      .where(eq(settings.id, 1))

    console.log(
      `[scheduler] Discovery cycle complete: ${result.newFlows.length} new, ${result.changedFlows.length} changed`
    )
  } catch (err) {
    console.error(
      "[scheduler] Discovery cycle failed:",
      err instanceof Error ? err.message : err
    )
  }
}

export function startScheduler(): void {
  const intervalMs =
    Number(process.env.DISCOVERY_INTERVAL_MS) || ONE_WEEK_MS

  console.log(
    `[scheduler] Scheduling discovery every ${intervalMs / 1000 / 60 / 60} hours`
  )

  setTimeout(() => {
    runDiscoveryCycle()
    intervalHandle = setInterval(runDiscoveryCycle, intervalMs)
  }, 30_000)
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
