import { defineTool } from "@mariozechner/pi-coding-agent"
import { Type } from "@mariozechner/pi-ai"

export interface DiscoveredFlows {
  newFlows: Array<{ name: string; description: string }>
  changedFlows: Array<{ existingFlowName: string; reason: string }>
}

export const submitDiscoveredFlowsTool = defineTool({
  name: "submit_discovered_flows",
  label: "Submit Discovered Flows",
  description:
    "Submit the discovered user flows from the code changes. Call this exactly once when you are done analyzing the diff.",
  parameters: Type.Object({
    newFlows: Type.Array(
      Type.Object({
        name: Type.String({
          description:
            "Short descriptive name for a newly discovered user flow (e.g., 'Delete Account', 'Export Data')",
        }),
        description: Type.String({
          description:
            "Description of what the user flow does, from the user's perspective",
        }),
      }),
      {
        description:
          "User flows that are NEW — functionality not covered by any existing flow",
      }
    ),
    changedFlows: Type.Array(
      Type.Object({
        existingFlowName: Type.String({
          description:
            "The name of an EXISTING flow whose functionality has been modified by these code changes",
        }),
        reason: Type.String({
          description:
            "Brief explanation of what changed that affects this existing flow",
        }),
      }),
      {
        description:
          "Existing user flows whose code has been modified by these changes",
      }
    ),
  }),
  execute: async (_toolCallId, params) => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(params) }],
      details: params as DiscoveredFlows,
    }
  },
})
