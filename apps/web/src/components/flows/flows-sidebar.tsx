import * as React from "react"
import { Link, useSearch } from "@tanstack/react-router"
import { FileTextIcon, AlertCircleIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { useSidebarResize } from "@/hooks/use-sidebar-resize"
import { useFlows } from "@/hooks/use-flows"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SidebarInput } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { type FlowStatus } from "@/types/flow"

function getStatusLabel(status: FlowStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusVariant(
  status: FlowStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  if (status === "pending" || status === "pending_approval") return "outline"
  if (status === "needs_update") return "destructive"
  return "secondary"
}

export function FlowsSidebar() {
  const { flowId } = useSearch({ from: "/flows/" })
  const [width, setWidth] = React.useState("16rem")
  const [isDraggingRail, setIsDraggingRail] = React.useState(false)
  const [showInProgressOnly, setShowInProgressOnly] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const { data: flows, isLoading } = useFlows()
  const queryClient = useQueryClient()
  const [isDiscovering, setIsDiscovering] = React.useState(false)

  async function handleDiscover() {
    setIsDiscovering(true)
    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiBaseUrl}/flows/discover`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "Unknown error")
        throw new Error(`API ${res.status}: ${body}`)
      }
      toast.success("Discovery started", {
        description: "Checking for new and changed flows...",
      })
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["flows"] })
        setIsDiscovering(false)
      }, 5000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed")
      setIsDiscovering(false)
    }
  }

  const visibleFlows = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!flows) return []

    return flows.filter((flow) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        flow.name.toLowerCase().includes(normalizedQuery) ||
        flow.description.toLowerCase().includes(normalizedQuery)

      const matchesProgressFilter =
        !showInProgressOnly ||
        (flow.status !== "completed" &&
          flow.status !== "failed" &&
          flow.status !== "pending_approval" &&
          flow.status !== "needs_update")

      return matchesQuery && matchesProgressFilter
    })
  }, [flows, searchQuery, showInProgressOnly])

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
      <div className="flex h-14 items-center justify-between border-b px-4 pt-1">
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
      <div className="flex items-center gap-2 border-b p-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search flows..."
            className="pl-8"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDiscover}
          disabled={isDiscovering}
        >
          {isDiscovering ? (
            <Spinner className="mr-1 size-4" />
          ) : (
            "Discover New"
          )}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner />
          </div>
        ) : visibleFlows.length === 0 ? (
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
                    {flow.status === "needs_update" && (
                      <AlertCircleIcon className="size-4 shrink-0 text-red-500" />
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(flow.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <Badge variant={getStatusVariant(flow.status)}>
                      {getStatusLabel(flow.status)}
                    </Badge>
                  </div>
                  <span className="line-clamp-2 text-xs whitespace-break-spaces text-muted-foreground">
                    {flow.description}
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
