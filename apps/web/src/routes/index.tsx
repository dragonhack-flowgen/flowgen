import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"
import { PlusIcon } from "lucide-react"
import { CreateFlowModal } from "@/components/flows/create-flow-modal"

export const Route = createFileRoute("/")({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />

      {/* Empty state — shown when no flows exist */}
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <PlusIcon className="size-8 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">
            Document your first user flow
          </h2>
          <p className="text-sm text-muted-foreground">
            Create step-by-step documentation with automated walkthrough videos.
          </p>
        </div>
        <CreateFlowModal />
      </div>
    </div>
  )
}
