import { Link, useSearch } from "@tanstack/react-router"
import { FileTextIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Flow } from "@/types/flow"

// TODO: Replace with real API call once backend endpoint exists
const MOCK_FLOWS: Pick<Flow, "id" | "name" | "status">[] = [
  { id: "1", name: "User Onboarding", status: "complete" },
  { id: "2", name: "Checkout Process", status: "draft" },
  { id: "3", name: "Password Reset", status: "generating" },
  { id: "4", name: "Admin Dashboard Setup", status: "pending_review" },
  { id: "5", name: "Profile Editing", status: "recording" },
]

export function FlowsSidebar() {
  const { flowId } = useSearch({ from: "/flows/" })

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Your Flows</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {MOCK_FLOWS.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No flows yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {MOCK_FLOWS.map((flow) => (
              <li key={flow.id}>
                <Link
                  to="/flows"
                  search={{ flowId: flow.id }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    flowId === flow.id &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                >
                  <FileTextIcon className="size-4 shrink-0" />
                  <span className="truncate">{flow.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}
