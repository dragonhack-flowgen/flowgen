export const RECORDING_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const

export type RecordingStatus = (typeof RECORDING_STATUSES)[number]
export type RecordingStorageMode = "local" | "uploadthing"
export type RecordingStorageProvider = "uploadthing"
export type UploadThingAcl = "public-read" | "private"

export interface CreateRecordingRequest {
  task: string
}

export interface CreateRecordingResponse {
  id: string
  status: RecordingStatus
}

export interface RecordingMessage {
  id: string
  role: string
  type: string
  summary: string
  data: string
  screenshotUrl: string | null
  hidden: boolean
  createdAt: string
}

export interface RecordingTimelineStep {
  stepNumber: number
  capturedAt: string
  type: string
  summary: string
  screenshotUrl: string | null
}

export interface RecordingArtifacts {
  provider: RecordingStorageProvider | null
  acl: UploadThingAcl | null
  fileKey: string | null
  uploadUrl: string | null
  localPath: string | null
  error: string | null
}

export interface RecordingStoredVideo {
  provider: RecordingStorageProvider | null
  acl: UploadThingAcl | null
  fileKey: string | null
  appUrl: string | null
  ufsUrl: string | null
  fileName: string | null
  fileSize: number | null
  error: string | null
}

export interface RecordingManifest {
  taskId: string
  task: string
  provider: "browser-use"
  sessionId: string
  startedAt: string
  endedAt: string
  stepCount: number
  lastStepSummary: string | null
  steps: RecordingTimelineStep[]
}

export interface RecorderConfig {
  pythonRecorderUrl: string
  storageMode: RecordingStorageMode
  taskRecordsDir: string
  appBaseUrl: string | null
  uploadThingToken: string | null
  uploadThingAcl: UploadThingAcl | null
  uploadThingSignedUrlTtlSeconds: number
}

export interface RunRecordingRequest {
  taskId: string
  task: string
}

export interface RunRecordingResult {
  manifest: RecordingManifest
  artifacts: RecordingArtifacts
  providerTaskId: string
}

export interface RecordingLinks {
  videoUrl: string | null
  downloadUrl: string | null
  liveUrl: string | null
}

export interface RecordingResponse {
  id: string
  task: string
  providerTaskId: string | null
  status: RecordingStatus
  artifacts: RecordingArtifacts | null
  manifest: RecordingManifest | null
  error: string | null
  createdAt: Date
  updatedAt: Date
  videoUrl: string | null
  downloadUrl: string | null
  liveUrl: string | null
}
