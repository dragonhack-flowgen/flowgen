import { execFile } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
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
import type { Guide } from "./structured-output.js"
import { submitGuideTool } from "./structured-output.js"

const execFileAsync = promisify(execFile)

const CACHE_DIR = join(tmpdir(), "flowgen-repos")

function repoCachePath(gitUrl: string): string {
  const normalized = gitUrl.replace(/[^a-zA-Z0-9._-]/g, "_")
  return join(CACHE_DIR, normalized)
}

export async function cloneOrUpdateRepo(gitUrl: string): Promise<string> {
  const repoDir = repoCachePath(gitUrl)

  try {
    if (existsSync(join(repoDir, ".git"))) {
      console.log(`[explorer] Cache hit, pulling latest for ${gitUrl}`)
      await execFileAsync("git", ["pull", "--ff-only"], {
        cwd: repoDir,
        timeout: 30_000,
      })
      return repoDir
    }

    console.log(`[explorer] Cloning ${gitUrl}...`)
    await mkdir(CACHE_DIR, { recursive: true })
    await execFileAsync("git", ["clone", "--depth", "1", gitUrl, repoDir], {
      timeout: 60_000,
    })
    return repoDir
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown git error"
    throw new Error(`Failed to access repository ${gitUrl}: ${message}`)
  }
}

export async function getHeadCommit(repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: repoPath,
  })
  return stdout.trim()
}

export async function getCommitLog(
  repoPath: string,
  fromCommit: string,
  toCommit: string
): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--oneline", `${fromCommit}..${toCommit}`],
    { cwd: repoPath }
  )
  return stdout.trim()
}

export async function getDiff(
  repoPath: string,
  fromCommit: string,
  toCommit: string
): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", `${fromCommit}..${toCommit}`],
    { cwd: repoPath }
  )
  return stdout.trim()
}

const SYSTEM_PROMPT = `You are a codebase exploration agent. Your job is to explore a codebase's UI components, routes, and navigation to understand how a specific user flow works, then produce TWO separate step-by-step guides.

Process:
1. Start by understanding the project structure (read package.json, look at the src/ or app/ directory)
2. Identify the routing setup and page components
3. Find the specific UI components involved in the requested flow
4. Trace the user-facing interactions from start to finish
5. When you have a complete understanding, call submit_guide with a title, guideSteps, and userDocSteps

You MUST produce two separate guides:

**guideSteps** — Browser automation agent guide:
- A single, linear, deterministic sequence of steps with NO branching or conditionals (no "if", "depending on", "either", "or")
- Specific steps with exact UI element labels, selectors, form field names, button text, and URLs
- Include concrete values where applicable (e.g., "Click the 'Settings' gear icon in the top-right corner", "Enter the email in the input field with placeholder 'Email address'")
- If multiple paths exist, pick the simplest one and commit to it — do not mention alternatives
- Designed for a browser automation agent that will execute the actions mechanically

**userDocSteps** — End-user documentation:
- General steps that describe what to do conceptually without dictating exact values
- Do NOT include specific UI element details or exact values (e.g., "Open your account settings", "Enter your email address")
- Assume the user has no technical knowledge
- Designed for non-technical human readers

Rules:
- Both guides must cover the same flow from start to finish
- If you cannot fully understand the flow, still submit your best effort with a note about uncertainty
- If there are multiple ways to accomplish the requested flow, always choose the simplest and most straightforward option
- You MUST call submit_guide exactly once before finishing`

export interface ExplorationResult {
  guide: string
  userDocs: string
}

export async function runExploration(
  gitUrl: string,
  flow: string
): Promise<ExplorationResult> {
  console.log(`[explorer] Fetching ${gitUrl}...`)
  const repoPath = await cloneOrUpdateRepo(gitUrl)
  console.log(`[explorer] Repo ready at ${repoPath}`)

  return await executeAgent(repoPath, flow)
}

async function executeAgent(repoPath: string, flow: string): Promise<ExplorationResult> {
  const providerId = process.env.PROVIDER_ID || "anthropic"
  const modelId = process.env.MODEL_ID || "claude-sonnet-4-20250514"
  console.log(`[explorer] Provider: ${providerId}, Model: ${modelId}`)

  const authStorage = AuthStorage.create(
    join(tmpdir(), `flowgen-auth-${Date.now()}`)
  )

  const apiKeyEnv = `${providerId.toUpperCase()}_API_KEY`
  const apiKey = process.env[apiKeyEnv] || process.env.ANTHROPIC_API_KEY
  console.log(`[explorer] API key env: ${apiKeyEnv}, found: ${!!apiKey}`)
  if (apiKey) {
    authStorage.setRuntimeApiKey(providerId, apiKey)
  }

  const modelRegistry = ModelRegistry.inMemory(authStorage)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let model = getModel(providerId as any, modelId as any)
  if (!model) {
    console.log(`[explorer] Model not built-in, registering custom model...`)
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
  console.log(`[explorer] Model resolved: ${model.id} (${model.api})`)

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
    getSystemPrompt: () => SYSTEM_PROMPT,
    getAppendSystemPrompt: () => [],
    extendResources: () => {},
    reload: async () => {},
  }

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: true, maxRetries: 2 },
  })

  console.log("[explorer] Creating agent session...")

  const { session } = await createAgentSession({
    cwd: repoPath,
    agentDir: join(tmpdir(), `flowgen-agent-${Date.now()}`),
    model,
    thinkingLevel: "off",
    authStorage,
    modelRegistry,
    resourceLoader,
    tools: createReadOnlyTools(repoPath),
    customTools: [submitGuideTool],
    sessionManager: SessionManager.inMemory(),
    settingsManager,
  })

  console.log("[explorer] Agent session created")

  let guideResult: Guide | null = null

  session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      const e = event as { toolName: string; args: unknown }
      console.log(
        `[explorer] Tool start: ${e.toolName}`,
        JSON.stringify(e.args, null, 2)
      )
    }
    if (event.type === "agent_end") {
      console.log("[explorer] Agent ended")
    }
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      process.stdout.write(event.assistantMessageEvent.delta)
    }
    if (
      event.type === "tool_execution_end" &&
      event.toolName === "submit_guide" &&
      !event.isError
    ) {
      console.log(
        "[explorer] submit_guide result:",
        JSON.stringify(event.result, null, 2)
      )
      const result = event.result as Record<string, unknown>
      guideResult = (result.details ?? result) as Guide
    }
  })

  console.log(`[explorer] Sending prompt: "${flow}"`)
  await session.prompt(
    `Explore this codebase and generate a user guide for the following flow:\n\n${flow}`
  )

  if (!guideResult) {
    throw new Error("Agent completed without submitting a guide")
  }

  const guide = guideResult as Guide
  console.log(
    `[explorer] Guide received: "${guide.title}" (guide: ${guide.guideSteps.length} steps, userDocs: ${guide.userDocSteps.length} steps)`
  )
  return {
    guide: guide.guideSteps.join("\n\n"),
    userDocs: guide.userDocSteps.join("\n\n"),
  }
}
