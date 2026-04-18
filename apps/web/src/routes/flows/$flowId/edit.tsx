import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/flows/$flowId/edit")({
  component: EditFlowPage,
})

function EditFlowPage() {
  const { flowId } = Route.useParams()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Edit Flow ${flowId}`}
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Flows", to: "/flows" },
          { label: `Flow ${flowId}`, to: `/flows/${flowId}` },
          { label: "Edit" },
        ]}
      />
      <p className="text-muted-foreground">Edit wizard — coming soon.</p>
    </div>
  )
}
