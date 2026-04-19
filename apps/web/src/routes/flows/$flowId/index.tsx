import { createFileRoute } from "@tanstack/react-router"
import { useFlow } from "@/hooks/use-flows"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { type FlowStatus } from "@/types/flow"

function getStatusVariant(
  status: FlowStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  if (status === "pending") return "outline"
  return "secondary"
}

function getStatusLabel(status: FlowStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{flow.name}</h1>
        <Badge variant={getStatusVariant(flow.status)}>
          {getStatusLabel(flow.status)}
        </Badge>
      </div>
      <p className="text-muted-foreground">{flow.description}</p>

      {flow.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <h3 className="text-sm font-medium text-destructive">Error</h3>
          <p className="mt-1 text-sm text-destructive/80">{flow.error}</p>
        </div>
      )}

      {flow.guide && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Guide</h2>
          <div className="rounded-lg border p-4">
            <pre className="whitespace-pre-wrap text-sm">{flow.guide}</pre>
          </div>
        </div>
      )}

      {flow.userDocs && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">User Documentation</h2>
          <div className="rounded-lg border p-4">
            <pre className="whitespace-pre-wrap text-sm">{flow.userDocs}</pre>
          </div>
        </div>
      )}

      {flow.status === "pending" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>Exploration in progress...</span>
        </div>
      )}

      {flow.status === "running" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>AI is exploring the codebase...</span>
        </div>
      )}
    </div>
  )
}
