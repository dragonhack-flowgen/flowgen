import { useQuery, useQueryClient } from "@tanstack/react-query"

const RECORDER_API_URL =
  import.meta.env.VITE_RECORDER_API_URL ?? "http://localhost:8002"

export type RecordingStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"

export type RecordingArtifacts = {
  provider: string
  fileKey: string
  uploadUrl: string
} | null

export type RecordingData = {
  taskId: string
  status: RecordingStatus
  currentStepNumber: number
  stepCount: number
  currentUrl: string | null
  currentTitle: string | null
  error: string | null
  isActive: boolean
  artifacts: RecordingArtifacts
  manifest: unknown
}

export function useRecordingStatus(flowId: string | undefined) {
  return useQuery<RecordingData | null>({
    queryKey: ["recording-status", flowId],
    queryFn: async () => {
      const res = await fetch(
        `${RECORDER_API_URL}/recordings/${flowId}`
      )
      if (!res.ok) {
        if (res.status === 404) return null
        const body = await res.text().catch(() => "Unknown error")
        throw new Error(`Recorder ${res.status}: ${body}`)
      }
      return res.json()
    },
    enabled: !!flowId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      if (data.status === "queued" || data.status === "running") return 3000
      return false
    },
    refetchIntervalInBackground: true,
  })
}

export function invalidateRecordingStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  flowId: string
) {
  void queryClient.invalidateQueries({
    queryKey: ["recording-status", flowId],
  })
}
