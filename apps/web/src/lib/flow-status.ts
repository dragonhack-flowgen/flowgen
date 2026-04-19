import type { FlowStatus } from "@/hooks/use-flows"

export function getStatusLabel(status: FlowStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

export function getStatusVariant(
  status: FlowStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  if (status === "pending" || status === "pending_approval") return "outline"
  if (status === "needs_update") return "destructive"
  return "secondary"
}
