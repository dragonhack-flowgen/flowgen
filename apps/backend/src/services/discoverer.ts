import { tmpdir } from "node:os"
import { join } from "node:path"
import { getModel } from "@mariozechner/pi-ai"
import {
  AuthStorage,
  createAgentSession,
  createExtensionRuntime,
  createReadOnlyTools,
  ModelRegistry,
  type ResourceLoader,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent"
import type { DiscoveredFlows } from "./discovery-output.js"
import { submitDiscoveredFlowsTool } from "./discovery-output.js"
import {
  cloneOrUpdateRepo,
  getCommitLog,
  getDiff,
  getHeadCommit,
} from "./explorer.js"

const DISCOVERY_SYSTEM_PROMPT = `You are a code change analysis agent. Your job is to analyze git diffs and commit messages to discover new user-facing features/flows and detect changes to existing ones.

You will be given:
1. A list of commit messages between two points in time
2. The full diff between those commits
3. A list of already-documented flows (to avoid duplicates)

Your task:
1. Identify any user-facing flows in the diff that are NOT already in the provided list of documented flows — these go in newFlows
2. Identify any flows from the provided list whose functionality has been modified by these changes — these go in changedFlows

Key distinction:
- "newFlows" means flows NOT YET documented in the database (the provided list), regardless of whether the feature is old or new in the codebase
- "changedFlows" means flows that ARE ALREADY in the database list and whose code has been modified by this diff
- If a flow exists in the database list, it can ONLY go in changedFlows (if modified) — never in newFlows

Rules:
- Only report user-facing flows, not internal/developer changes
- Be specific — describe what the user can DO, not what the code does
- If a change is purely a bug fix that doesn't change the user-facing behavior, do NOT report it as a changed flow
- If a change refactors code without changing user-facing behavior, do NOT report it
- Do NOT propose flows that already exist in the provided list — check carefully for duplicates
- Each flow must appear in EXACTLY ONE category: either newFlows OR changedFlows, never both
- If a feature is entirely new and not covered by any existing flow, put it in newFlows only
- If a feature modifies an existing documented flow, put it in changedFlows only
- For new flows, provide a clear name and description from the user's perspective
- For changed flows, reference the exact existing flow name and explain what changed
- If no new flows or changed flows are found, submit empty arrays — this is valid
- You MUST call submit_discovered_flows exactly once before finishing`

export interface DiscoveryResult {
  newFlows: Array<{ name: string; description: string }>
  changedFlows: Array<{ existingFlowName: string; reason: string }>
}

export async function runDiscovery(
  gitUrl: string,
  lastExploredCommit: string,
  existingFlows: Array<{ name: string; description: string }>
): Promise<{ result: DiscoveryResult; headCommit: string }> {
  console.log(`[discoverer] Fetching ${gitUrl}...`)
  const repoPath = await cloneOrUpdateRepo(gitUrl)

  const headCommit = await getHeadCommit(repoPath)
  if (headCommit === lastExploredCommit) {
    console.log("[discoverer] No new commits since last exploration")
    return {
      result: { newFlows: [], changedFlows: [] },
      headCommit,
    }
  }

  const commitLog = await getCommitLog(repoPath, lastExploredCommit, headCommit)
  const diff = await getDiff(repoPath, lastExploredCommit, headCommit)

  if (!diff) {
    console.log("[discoverer] Empty diff, nothing to discover")
    return {
      result: { newFlows: [], changedFlows: [] },
      headCommit,
    }
  }

  const MAX_DIFF_SIZE = 100_000
  const truncatedDiff =
    diff.length > MAX_DIFF_SIZE
      ? diff.slice(0, MAX_DIFF_SIZE) + "\n\n... (diff truncated)"
      : diff

  const existingFlowsList =
    existingFlows.length > 0
      ? existingFlows
          .map((f) => `- "${f.name}": ${f.description}`)
          .join("\n")
      : "(none — no existing flows documented yet)"

  const prompt = `Analyze the following code changes and discover user-facing flows.

## Commit Messages
${commitLog || "(no commit messages)"}

## Existing Documented Flows (do NOT duplicate these)
${existingFlowsList}

## Full Diff
${truncatedDiff}`

  const discoveryResult = await executeDiscoveryAgent(repoPath, prompt)

  return { result: discoveryResult, headCommit }
}

async function executeDiscoveryAgent(
  repoPath: string,
  prompt: string
): Promise<DiscoveryResult> {
  const providerId = process.env.PROVIDER_ID || "anthropic"
  const modelId = process.env.MODEL_ID || "claude-sonnet-4-20250514"
  console.log(`[discoverer] Provider: ${providerId}, Model: ${modelId}`)

  const authStorage = AuthStorage.create(
    join(tmpdir(), `flowgen-auth-disc-${Date.now()}`)
  )

  const apiKeyEnv = `${providerId.toUpperCase()}_API_KEY`
  const apiKey = process.env[apiKeyEnv] || process.env.ANTHROPIC_API_KEY
  console.log(`[discoverer] API key env: ${apiKeyEnv}, found: ${!!apiKey}`)
  if (apiKey) {
    authStorage.setRuntimeApiKey(providerId, apiKey)
  }

  const modelRegistry = ModelRegistry.inMemory(authStorage)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let model = getModel(providerId as any, modelId as any)
  if (!model) {
    console.log(`[discoverer] Model not built-in, registering custom model...`)
    modelRegistry.registerProvider(providerId, {
      api: "openai-completions",
      baseUrl: "https://api.z.ai/api/coding/paas/v4",
      models: [
        {
          id: modelId,
          name: modelId,
          api: "openai-completions",
          baseUrl: "https://api.z.ai/api/coding/paas/v4",
          reasoning: true,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 131072,
          maxTokens: 98304,
          compat: { supportsDeveloperRole: false, thinkingFormat: "zai" },
        },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model = getModel(providerId as any, modelId as any)
  }
  if (!model) throw new Error(`Model not found: ${providerId}/${modelId}`)
  console.log(`[discoverer] Model resolved: ${model.id} (${model.api})`)

  const resourceLoader: ResourceLoader = {
    getExtensions: () => ({
      extensions: [],
      errors: [],
      runtime: createExtensionRuntime(),
    }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => DISCOVERY_SYSTEM_PROMPT,
    getAppendSystemPrompt: () => [],
    extendResources: () => {},
    reload: async () => {},
  }

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: true, maxRetries: 2 },
  })

  console.log("[discoverer] Creating discovery agent session...")

  const { session } = await createAgentSession({
    cwd: repoPath,
    agentDir: join(tmpdir(), `flowgen-agent-disc-${Date.now()}`),
    model,
    thinkingLevel: "off",
    authStorage,
    modelRegistry,
    resourceLoader,
    tools: createReadOnlyTools(repoPath),
    customTools: [submitDiscoveredFlowsTool],
    sessionManager: SessionManager.inMemory(),
    settingsManager,
  })

  console.log("[discoverer] Discovery agent session created")

  let discoveryResult: DiscoveredFlows | null = null

  session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      const e = event as { toolName: string; args: unknown }
      console.log(
        `[discoverer] Tool start: ${e.toolName}`,
        JSON.stringify(e.args, null, 2)
      )
    }
    if (event.type === "agent_end") {
      console.log("[discoverer] Agent ended")
    }
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      process.stdout.write(event.assistantMessageEvent.delta)
    }
    if (
      event.type === "tool_execution_end" &&
      event.toolName === "submit_discovered_flows" &&
      !event.isError
    ) {
      console.log(
        "[discoverer] submit_discovered_flows result:",
        JSON.stringify(event.result, null, 2)
      )
      const result = event.result as Record<string, unknown>
      discoveryResult = (result.details ?? result) as DiscoveredFlows
    }
  })

  console.log(`[discoverer] Sending discovery prompt...`)
  await session.prompt(prompt)

  if (!discoveryResult) {
    throw new Error(
      "Discovery agent completed without submitting discovered flows"
    )
  }

  const discovered = discoveryResult as DiscoveredFlows
  console.log(
    `[discoverer] Discovery complete: ${discovered.newFlows.length} new flows, ${discovered.changedFlows.length} changed flows`
  )
  return discovered
}
