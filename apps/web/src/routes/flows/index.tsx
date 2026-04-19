import { createFileRoute } from "@tanstack/react-router"
import { FlowsSidebar } from "@/components/flows/flows-sidebar"
import { useFlow } from "@/hooks/use-flows"
import { Spinner } from "@/components/ui/spinner"
import { FlowDetailPanel } from "@/components/flows/flow-detail-panel"
import * as z from "zod"

export const Route = createFileRoute("/flows/")({
  validateSearch: (search) =>
    z.object({ flowId: z.string().optional() }).parse(search),
  component: FlowsPage,
})

function FlowsPage() {
  const { flowId } = Route.useSearch()

  return (
    <div className="flex h-full">
      <FlowsSidebar />
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto">
          {flowId ? <FlowDetail flowId={flowId} /> : <EmptyState />}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <p className="text-muted-foreground">
        Select a flow from the sidebar to view details.
      </p>
    </div>
  )
}

function FlowDetail({ flowId }: { flowId: string }) {
  const { data: flow, isLoading, error } = useFlow(flowId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load flow"}
        </p>
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="text-sm text-muted-foreground">Flow not found.</p>
      </div>
    )
  }

  return <FlowDetailPanel flow={flow} />
}
