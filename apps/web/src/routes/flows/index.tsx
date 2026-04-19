import { createFileRoute } from "@tanstack/react-router"
import { AppHeader } from "@/components/layout/app-header"
import { PageHeader } from "@/components/layout/page-header"
import { FlowsSidebar } from "@/components/flows/flows-sidebar"

import * as z from "zod"

export const Route = createFileRoute("/flows/")({
  validateSearch: (search) =>
    z.object({ flowId: z.string().optional() }).parse(search),
  component: FlowsPage,
})

function FlowsPage() {
  return (
    <div className="flex h-full">
      <FlowsSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title="Flows" />
          <p className="text-muted-foreground">Flows library — coming soon.</p>
        </div>
      </div>
    </div>
  )
}
