export const FLOW_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "pending_approval",
  "needs_update",
] as const

export type FlowStatus = (typeof FLOW_STATUSES)[number]

export type Flow = {
  id: string
  name: string
  description: string
  status: FlowStatus
  guide: string | null
  userDocs: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}
