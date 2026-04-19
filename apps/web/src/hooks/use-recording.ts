import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { API_BASE_URL, RECORDER_API_URL } from "@/lib/api"

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

type BackendRecordingRow = {
  id: string
  task: string
  providerTaskId: string | null
  status: "pending" | "running" | "completed" | "failed"
  artifacts: RecordingArtifacts
  manifest: {
    stepCount?: number
  } | null
  error: string | null
}

function mapBackendStatus(status: BackendRecordingRow["status"]): RecordingStatus {
  if (status === "pending") return "queued"
  return status
}

function mapBackendRecording(row: BackendRecordingRow): RecordingData {
  const stepCount = row.manifest?.stepCount ?? 0

  return {
    taskId: row.providerTaskId ?? row.id,
    status: mapBackendStatus(row.status),
    currentStepNumber: stepCount,
    stepCount,
    currentUrl: null,
    currentTitle: null,
    error: row.error,
    isActive: row.status === "pending" || row.status === "running",
    artifacts: row.artifacts,
    manifest: row.manifest,
  }
}

async function fetchBackendRecording(flowId: string): Promise<RecordingData | null> {
  const res = await fetch(`${API_BASE_URL}/recordings/${flowId}`)
  if (!res.ok) {
    if (res.status === 404) return null
    const body = await res.text().catch(() => "Unknown error")
    throw new Error(`API ${res.status}: ${body}`)
  }

  const row = (await res.json()) as BackendRecordingRow
  return mapBackendRecording(row)
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
      const res = await fetch(`${RECORDER_API_URL}/recordings/${flowId}`)
      if (!res.ok) {
        if (res.status === 404) return fetchBackendRecording(flowId!)
        const body = await res.text().catch(() => "Unknown error")
        throw new Error(`Recorder ${res.status}: ${body}`)
      }
      const recorderData = (await res.json()) as RecordingData

      if (
        recorderData.status === "completed" &&
        !recorderData.artifacts?.uploadUrl
      ) {
        return (await fetchBackendRecording(flowId!)) ?? recorderData
      }

      return recorderData
    },
    enabled: !!flowId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 2000
      if (data.status === "queued" || data.status === "running") return 2000
      return false
    },
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
