import { createFileRoute, useSearch } from "@tanstack/react-router"
import { FlowsSidebar } from "@/components/flows/flows-sidebar"
import { FlowDetailPanel } from "@/components/flows/flow-detail-panel"
import { MOCK_FLOWS } from "@/data/mock-flows"

import * as z from "zod"

export const Route = createFileRoute("/flows/")({
  validateSearch: (search) =>
    z.object({ flowId: z.string().optional() }).parse(search),
  component: FlowsPage,
})

function FlowsPage() {
  const { flowId } = useSearch({ from: "/flows/" })
  const selectedFlow = flowId
    ? MOCK_FLOWS.find((f) => f.id === flowId)
    : undefined

  return (
    <div className="flex h-full">
      <FlowsSidebar />
      <div className="flex flex-1 flex-col">
        {selectedFlow ? (
          <FlowDetailPanel flow={selectedFlow} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">
              Select a flow to view its details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
