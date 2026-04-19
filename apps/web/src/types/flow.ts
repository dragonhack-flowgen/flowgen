export const FLOW_STATUSES = [
  "draft",
  "generating",
  "pending_review",
  "recording",
  "complete",
  "failed",
] as const

export type FlowStatus = (typeof FLOW_STATUSES)[number]

export type Flow = {
  id: string
  name: string
  purpose: string
  end_outcome: string
  start_page: string
  start_conditions: string | null
  description: string
  status: FlowStatus
  steps_md: string | null
  video_url: string | null
  created_at: string
  updated_at: string
}
