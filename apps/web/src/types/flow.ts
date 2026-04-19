export type FlowStatus =
  | "pending"
  | "pending_approval"
  | "running"
  | "completed"
  | "failed"
  | "needs_update"

export type Flow = {
  id: string
  name: string
  description: string
  status: FlowStatus
  guide: string | null
  userDocs: string | null
  error: string | null
  createdAt: string
}
