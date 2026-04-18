import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/flows/new/")({
  component: NewFlowPage,
})

function NewFlowPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create New Flow"
        breadcrumbs={[
          { label: "Flows", to: "/flows" },
          { label: "New Flow" },
        ]}
      />
      <p className="text-muted-foreground">
        Create wizard — coming soon.
      </p>
    </div>
  )
}
