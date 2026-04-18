import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/flows/new/")({
  staticData: { breadcrumb: "New Flow" },
  component: NewFlowPage,
})

function NewFlowPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Create New Flow" />
      <p className="text-muted-foreground">Create wizard — coming soon.</p>
    </div>
  )
}
