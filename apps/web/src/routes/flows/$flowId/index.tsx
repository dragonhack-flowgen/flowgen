import { createFileRoute } from "@tanstack/react-router"
import { useFlow } from "@/hooks/use-flows"
import { Spinner } from "@/components/ui/spinner"
import { FlowDetailPanel } from "@/components/flows/flow-detail-panel"

export const Route = createFileRoute("/flows/$flowId/")({
  component: FlowDetailPage,
})

function FlowDetailPage() {
  const { flowId } = Route.useParams()
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
