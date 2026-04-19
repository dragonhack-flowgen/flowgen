import {
  AlertCircleIcon,
  CheckCircleIcon,
  FlagIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  type Flow,
  useApproveFlow,
  useReExploreFlow,
  useDismissFlow,
  useFlagFlow,
} from "@/hooks/use-flows"
import { getStatusLabel, getStatusVariant } from "@/lib/flow-status"
import { PromptSection } from "./prompt-section"
import { GuideSection } from "./guide-section"
import { UserDocsSection } from "./user-docs-section"

type FlowDetailPanelProps = Readonly<{
  flow: Flow
}>

export function FlowDetailPanel({ flow }: FlowDetailPanelProps) {
  const approveFlow = useApproveFlow()
  const reExploreFlow = useReExploreFlow()
  const dismissFlow = useDismissFlow()
  const flagFlow = useFlagFlow()

  async function handleApprove() {
    try {
      await approveFlow.mutateAsync(flow.id)
      toast.success("Flow approved", { description: "Exploration has started." })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve flow")
    }
  }

  async function handleReExplore() {
    try {
      await reExploreFlow.mutateAsync(flow.id)
      toast.success("Re-exploration started")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-explore")
    }
  }

  async function handleDismiss() {
    try {
      await dismissFlow.mutateAsync(flow.id)
      toast.success("Update dismissed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss")
    }
  }

  async function handleFlag() {
    try {
      await flagFlow.mutateAsync({ id: flow.id })
      toast.success("Flow flagged for review")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to flag flow")
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl leading-none font-semibold">{flow.name}</h2>
          {flow.status === "needs_update" && (
            <AlertCircleIcon className="size-5 text-red-500" />
          )}
          <Badge variant={getStatusVariant(flow.status)}>
            {getStatusLabel(flow.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {flow.status === "pending_approval" && (
            <Button size="sm" onClick={handleApprove}>
              <CheckCircleIcon className="mr-1 size-4" />
              Approve
            </Button>
          )}
          {flow.status === "needs_update" && (
            <>
              <Button size="sm" onClick={handleReExplore}>
                <RefreshCwIcon className="mr-1 size-4" />
                Re-explore
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                <XIcon className="mr-1 size-4" />
                Dismiss
              </Button>
            </>
          )}
          {flow.status === "completed" && (
            <Button size="sm" variant="outline" onClick={handleFlag}>
              <FlagIcon className="mr-1 size-4" />
              Flag
            </Button>
          )}
        </div>
      </div>

      {flow.error && flow.status === "needs_update" && (
        <div className="border-b border-amber-500/50 bg-amber-500/5 px-4 py-3">
          <h3 className="text-sm font-medium text-amber-600">Update Detected</h3>
          <p className="mt-1 text-sm text-amber-600/80">{flow.error}</p>
        </div>
      )}

      {flow.error && flow.status === "failed" && (
        <div className="border-b border-destructive/50 bg-destructive/5 px-4 py-3">
          <h3 className="text-sm font-medium text-destructive">Error</h3>
          <p className="mt-1 text-sm text-destructive/80">{flow.error}</p>
        </div>
      )}

      <div className="flex flex-col gap-8 p-6">
        <PromptSection flow={flow} />
        <Separator />
        <GuideSection flow={flow} />
        <Separator />
        <UserDocsSection flow={flow} />
      </div>

      {(flow.status === "pending" || flow.status === "running") && (
        <div className="flex items-center gap-2 border-t px-6 py-3 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          <span>
            {flow.status === "pending"
              ? "Exploration in progress..."
              : "AI is exploring the codebase..."}
          </span>
        </div>
      )}
    </div>
  )
}
