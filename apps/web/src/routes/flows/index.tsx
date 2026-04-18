import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/flows/")({
  component: FlowsPage,
})

function FlowsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flows"
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Flows" },
        ]}
      />
      <p className="text-muted-foreground">Flows library — coming soon.</p>
    </div>
  )
}
