export const FLOW_STATUSES = [
  "draft",
  "generating",
  "pending_review",
  "recording",
  "complete",
  "failed",
] as const

export type FlowStatus = (typeof FLOW_STATUSES)[number]

export type FlowStep = {
  id: string
  order: number
  instruction: string
}

export type Flow = {
  id: string
  name: string
  purpose: string
  end_outcome: string
  start_page: string
  start_conditions: string | null
  description: string
  status: FlowStatus
  steps: FlowStep[]
  video_url: string | null
  created_at: string
  updated_at: string
}
