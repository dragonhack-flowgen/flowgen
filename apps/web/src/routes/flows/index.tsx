import { createFileRoute } from "@tanstack/react-router"
import { FlowsSidebar } from "@/components/flows/flows-sidebar"
import { useFlow } from "@/hooks/use-flows"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { type FlowStatus } from "@/types/flow"
import * as z from "zod"

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
            <pre className="text-sm whitespace-pre-wrap">{flow.guide}</pre>
          </div>
        </div>
      )}

      {flow.userDocs && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">User Documentation</h2>
          <div className="rounded-lg border p-4">
            <pre className="text-sm whitespace-pre-wrap">{flow.userDocs}</pre>
          </div>
        </div>
      )}

      {(flow.status === "pending" || flow.status === "running") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>
            {flow.status === "pending"
              ? "Exploration in progress..."
              : "AI is exploring the codebase..."}
          </span>
        </div>
      )}
    </div>
  )
}
