import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/flows/$flowId/")({
  component: FlowDetailPage,
})

function FlowDetailPage() {
  const { flowId } = Route.useParams()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Flow ${flowId}`}
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Flows", to: "/flows" },
          { label: `Flow ${flowId}` },
        ]}
      />
      <p className="text-muted-foreground">Flow detail — coming soon.</p>
    </div>
  )
}
