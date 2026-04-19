import * as z from "zod"

export const FLOW_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
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
  if (status === "pending") return "outline"
  return "secondary"
}

export const promptSchema = z.object({
  name: z
    .string()
    .min(4, "Flow name must be at least 4 characters.")
    .max(24, "Flow name must be at most 24 characters."),
  description: z
    .string()
    .min(12, "Description must be at least 12 characters.")
    .max(500, "Description must be at most 500 characters."),
})

export type PromptFormData = z.infer<typeof promptSchema>
