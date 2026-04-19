import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RECORDER_API_URL } from "@/lib/api"

type RecordingStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

type RecordingArtifacts = {
  uploadUrl?: string
  logsUrl?: string
  traceUrl?: string
}

type RecordingData = {
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

const recordingStatusQueryKey = (flowId: string | undefined) => [
  "recording-status",
  flowId,
] as const

export function useRecordingStatus(flowId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery<RecordingData | null>({
    queryKey: recordingStatusQueryKey(flowId),
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
  })

  React.useEffect(() => {
    const recording = query.data
    if (!flowId || !recording) return
    if (recording.status === "completed" || recording.status === "failed") return

    const eventSource = new EventSource(
      `${RECORDER_API_URL}/recordings/${flowId}/events`
    )

    const handleStatus = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as RecordingData
      queryClient.setQueryData(recordingStatusQueryKey(flowId), payload)

      if (payload.status === "completed" || payload.status === "failed") {
        eventSource.close()
      }
    }

    eventSource.addEventListener("status", handleStatus as EventListener)
    eventSource.onerror = () => {
      eventSource.close()
      void queryClient.invalidateQueries({
        queryKey: recordingStatusQueryKey(flowId),
      })
    }

    return () => {
      eventSource.removeEventListener("status", handleStatus as EventListener)
      eventSource.close()
    }
  }, [flowId, query.data, queryClient])

  return query
}

export function invalidateRecordingStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  flowId: string
) {
  void queryClient.invalidateQueries({
    queryKey: recordingStatusQueryKey(flowId),
  })
}
