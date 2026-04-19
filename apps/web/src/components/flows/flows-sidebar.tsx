import * as React from "react"
import { Link, useSearch } from "@tanstack/react-router"
import { FileTextIcon } from "lucide-react"

import { useSidebarResize } from "@/hooks/use-sidebar-resize"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { SidebarInput } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { type Flow, type FlowStatus } from "@/types/flow"

type SidebarFlow = Pick<Flow, "id" | "name" | "status"> & {
  updatedAt: string
  summary: string
}

const MOCK_FLOWS: SidebarFlow[] = [
  {
    id: "1",
    name: "User Onboarding",
    status: "complete",
    updatedAt: "Today",
    summary: "Guided onboarding from signup to first successful action.",
  },
  {
    id: "2",
    name: "Checkout Process",
    status: "draft",
    updatedAt: "Yesterday",
    summary: "Covers cart review, payment details, and confirmation page.",
  },
  {
    id: "3",
    name: "Password Reset",
    status: "generating",
    updatedAt: "2 days ago",
    summary: "Flow for forgot-password email, token validation, and reset.",
  },
  {
    id: "4",
    name: "Admin Dashboard Setup",
    status: "pending_review",
    updatedAt: "3 days ago",
    summary: "Initial admin setup including roles, permissions, and defaults.",
  },
  {
    id: "5",
    name: "Profile Editing",
    status: "recording",
    updatedAt: "1 week ago",
    summary: "User profile updates including image upload and preferences.",
  },
]

function getStatusLabel(status: FlowStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusVariant(
  status: FlowStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "complete") return "default"
  if (status === "failed") return "destructive"
  if (status === "draft") return "outline"
  return "secondary"
}

export function FlowsSidebar() {
  const { flowId } = useSearch({ from: "/flows/" })
  const [width, setWidth] = React.useState("16rem")
  const [isDraggingRail, setIsDraggingRail] = React.useState(false)
  const [showInProgressOnly, setShowInProgressOnly] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const visibleFlows = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return MOCK_FLOWS.filter((flow) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        flow.name.toLowerCase().includes(normalizedQuery) ||
        flow.summary.toLowerCase().includes(normalizedQuery)

      const matchesProgressFilter =
        !showInProgressOnly ||
        (flow.status !== "complete" && flow.status !== "failed")

      return matchesQuery && matchesProgressFilter
    })
  }, [searchQuery, showInProgressOnly])

  const { dragRef, handleMouseDown } = useSidebarResize({
    direction: "right",
    currentWidth: width,
    onResize: setWidth,
    minResizeWidth: "14rem",
    maxResizeWidth: "26rem",
    enableAutoCollapse: false,
    enableDrag: true,
    setIsDraggingRail,
    widthCookieName: "flows-sidebar:width",
  })

  return (
    <aside
      style={{ "--flows-sidebar-width": width } as React.CSSProperties}
      data-dragging={isDraggingRail}
      className="relative flex h-full w-(--flows-sidebar-width) shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 ease-linear data-[dragging=true]:duration-0"
    >
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-base font-medium text-foreground">Your Flows</h2>
        <Label className="flex items-center gap-2 text-sm">
          <span>In progress</span>
          <Switch
            checked={showInProgressOnly}
            onCheckedChange={setShowInProgressOnly}
            className="shadow-none"
          />
        </Label>
      </div>
      <div className="border-b p-4">
        <SidebarInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search flows..."
        />
      </div>
      <nav className="flex-1 overflow-y-auto">
        {visibleFlows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No flows yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {visibleFlows.map((flow) => (
              <li key={flow.id}>
                <Link
                  to="/flows"
                  search={{ flowId: flow.id }}
                  className={cn(
                    "flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    flowId === flow.id &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <FileTextIcon className="size-4 shrink-0" />
                    <span className="truncate font-medium">{flow.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {flow.updatedAt}
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <Badge variant={getStatusVariant(flow.status)}>
                      {getStatusLabel(flow.status)}
                    </Badge>
                  </div>
                  <span className="line-clamp-2 text-xs whitespace-break-spaces text-muted-foreground">
                    {flow.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <button
        ref={dragRef}
        aria-label="Resize Flows Sidebar"
        tabIndex={-1}
        onMouseDown={handleMouseDown}
        className="absolute inset-y-0 -right-2 z-20 hidden w-4 cursor-ew-resize transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 hover:after:bg-sidebar-border sm:flex"
      />
    </aside>
  )
}
