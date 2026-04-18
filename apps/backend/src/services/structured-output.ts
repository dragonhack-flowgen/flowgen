import { defineTool } from "@mariozechner/pi-coding-agent"
import { Type } from "@mariozechner/pi-ai"

export interface Guide {
  title: string
  steps: string[]
}

export const submitGuideTool = defineTool({
  name: "submit_guide",
  label: "Submit Guide",
  description:
    "Submit the final step-by-step user instruction guide. Call this exactly once when you are done exploring the codebase and have formulated the complete guide.",
  parameters: Type.Object({
    title: Type.String({
      description: "Short descriptive title for the guide",
    }),
    steps: Type.Array(Type.String(), {
      description:
        "Ordered list of steps a non-technical end user should follow. Each step should be clear, specific, and reference UI elements by their visible labels.",
    }),
  }),
  execute: async (_toolCallId, params) => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(params) }],
      details: params as Guide,
    }
  },
})
