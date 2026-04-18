import { defineTool } from "@mariozechner/pi-coding-agent"
import { Type } from "@mariozechner/pi-ai"

export interface Guide {
  title: string
  guideSteps: string[]
  userDocSteps: string[]
}

export const submitGuideTool = defineTool({
  name: "submit_guide",
  label: "Submit Guide",
  description:
    "Submit the final exploration result with TWO separate guides. Call this exactly once when you are done exploring the codebase.",
  parameters: Type.Object({
    title: Type.String({
      description: "Short descriptive title for the guide",
    }),
    guideSteps: Type.Array(Type.String(), {
      description:
        "Browser automation agent guide: ordered steps with exact UI element labels, selectors, form field names, button text, and concrete values. Designed for a browser automation agent that will execute actions.",
    }),
    userDocSteps: Type.Array(Type.String(), {
      description:
        "End-user documentation: ordered general steps without specific/dictated values. Describe what to do conceptually (e.g., 'Open your account settings', 'Enter your email address'). Designed for non-technical human readers.",
    }),
  }),
  execute: async (_toolCallId, params) => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(params) }],
      details: params as Guide,
    }
  },
})
