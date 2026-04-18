import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/page-header"

import * as z from "zod"

export const Route = createFileRoute("/flows/")({
  validateSearch: (search) => z.object({ flowId: z.string().optional() }).parse(search),
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
