import { resolve } from "node:path"
import { readFile } from "node:fs/promises"
import { UTApi, UTFile } from "uploadthing/server"
import type {
  RecorderConfig,
  RecordingArtifacts,
  RecordingManifest,
  RecordingStoredVideo,
  RunRecordingRequest,
  RunRecordingResult,
  UploadThingAcl,
} from "../types/recordings.js"

interface PythonRecorderResponse {
  providerTaskId: string
  manifest: RecordingManifest
  artifacts: RecordingArtifacts
  historyPath: string | null
  rawVideoPath: string | null
  taskDir: string
}

function getStringEnv(name: string, defaultValue: string): string {
  const value = process.env[name]
  return value && value.trim() !== "" ? value.trim() : defaultValue
}

function getIntegerEnv(name: string, defaultValue: number): number {
  const value = process.env[name]
  if (!value || value.trim() === "") {
    return defaultValue
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be an integer.`)
  }

  return parsed
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]
  if (!value || value.trim() === "") {
    return null
  }

  return value.trim()
}

function isStorageMode(value: string): value is RecorderConfig["storageMode"] {
  return value === "local" || value === "uploadthing"
}

function isUploadThingAcl(value: string): value is UploadThingAcl {
  return value === "public-read" || value === "private"
}

export function getRecorderConfig(): RecorderConfig {
  const storageModeValue = getStringEnv("RECORDING_STORAGE_MODE", "local")
  if (!isStorageMode(storageModeValue)) {
    throw new Error(`Unsupported RECORDING_STORAGE_MODE: ${storageModeValue}`)
  }

  const uploadThingAclValue = getOptionalEnv("UPLOADTHING_ACL")
  if (uploadThingAclValue !== null && !isUploadThingAcl(uploadThingAclValue)) {
    throw new Error(`Unsupported UPLOADTHING_ACL: ${uploadThingAclValue}`)
  }

  return {
    pythonRecorderUrl: getStringEnv(
      "PYTHON_RECORDER_URL",
      "http://localhost:8002"
    ),
    storageMode: storageModeValue,
    taskRecordsDir: resolve(
      getStringEnv("BROWSER_USE_TASK_RECORDS_DIR", "task_records")
    ),
    appBaseUrl: getOptionalEnv("APP_BASE_URL"),
    uploadThingToken: getOptionalEnv("UPLOADTHING_TOKEN"),
    uploadThingAcl: uploadThingAclValue,
    uploadThingSignedUrlTtlSeconds: getIntegerEnv(
      "UPLOADTHING_SIGNED_URL_TTL_SECONDS",
      3_600
    ),
  }
}

function emptyStoredVideo(error: string | null = null): RecordingStoredVideo {
  return {
    provider: null,
    acl: null,
    fileKey: null,
    appUrl: null,
    ufsUrl: null,
    fileName: null,
    fileSize: null,
    error,
  }
}

export async function uploadRecordingFileToUploadThing(
  taskId: string,
  fileName: string,
  fileBytes: Uint8Array
): Promise<RecordingArtifacts> {
  const config = getRecorderConfig()
  if (config.uploadThingToken === null) {
    throw new Error(
      "UPLOADTHING_TOKEN is required when RECORDING_STORAGE_MODE=uploadthing."
    )
  }

  const safeFile = new UTFile([Buffer.from(fileBytes)], fileName, {
    type: "video/mp4",
    customId: `recording-${taskId}`,
  })
  const utapi = new UTApi({ token: config.uploadThingToken })
  const uploadResult = await utapi.uploadFiles(safeFile, {
    contentDisposition: "inline",
    acl: config.uploadThingAcl ?? undefined,
  })

  if (uploadResult.error !== null) {
    throw new Error(uploadResult.error.message)
  }

  return {
    provider: "uploadthing",
    acl: config.uploadThingAcl,
    fileKey: uploadResult.data.key,
    uploadUrl: uploadResult.data.appUrl ?? uploadResult.data.ufsUrl,
    localPath: null,
    error: null,
  }
}

export function getInternalApiSecret(): string {
  return getStringEnv("INTERNAL_API_SECRET", "flowgen-internal-dev-secret")
}

function logRecording(taskId: string, message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(`[recordings:${taskId}] ${message}`)
    return
  }

  console.log(`[recordings:${taskId}] ${message}`, details)
}

function isRecordingManifest(value: unknown): value is RecordingManifest {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return (
    typeof Reflect.get(value, "taskId") === "string" &&
    typeof Reflect.get(value, "task") === "string" &&
    typeof Reflect.get(value, "sessionId") === "string" &&
    Array.isArray(Reflect.get(value, "steps"))
  )
}

function isPythonRecorderResponse(value: unknown): value is PythonRecorderResponse {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return (
    typeof Reflect.get(value, "providerTaskId") === "string" &&
    isRecordingManifest(Reflect.get(value, "manifest")) &&
    typeof Reflect.get(value, "artifacts") === "object"
  )
}

async function callPythonRecorder(
  request: RunRecordingRequest,
  config: RecorderConfig
): Promise<PythonRecorderResponse> {
  const endpoint = new URL("/recordings/run", config.pythonRecorderUrl).toString()
  logRecording(request.taskId, "Dispatching run to Python recorder", { endpoint })

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      taskId: request.taskId,
      task: request.task,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Python recorder failed with ${response.status} ${response.statusText}: ${body}`
    )
  }

  const payload: unknown = await response.json()
  if (!isPythonRecorderResponse(payload)) {
    throw new Error("Python recorder returned an invalid response payload.")
  }

  return payload
}

async function buildArtifacts(
  pythonArtifacts: RecordingArtifacts,
  config: RecorderConfig
): Promise<RecordingArtifacts> {
  if (pythonArtifacts.error !== null) {
    throw new Error(pythonArtifacts.error)
  }

  if (config.storageMode === "uploadthing") {
    if (pythonArtifacts.provider !== "uploadthing") {
      throw new Error("Python recorder did not upload the recording to UploadThing.")
    }
    if (pythonArtifacts.fileKey === null || pythonArtifacts.uploadUrl === null) {
      throw new Error("Python recorder returned incomplete UploadThing metadata.")
    }
    return pythonArtifacts
  }

  if (pythonArtifacts.localPath === null) {
    throw new Error("Recording video was not produced by the Python recorder.")
  }

  return pythonArtifacts
}

export async function runRecording(
  request: RunRecordingRequest
): Promise<RunRecordingResult> {
  const config = getRecorderConfig()
  const pythonResult = await callPythonRecorder(request, config)
  const artifacts = await buildArtifacts(pythonResult.artifacts, config)

  logRecording(request.taskId, "Python recorder run completed", {
    providerTaskId: pythonResult.providerTaskId,
    localVideoPath: artifacts.localPath,
    storageMode: config.storageMode,
    storageProvider: artifacts.provider,
  })

  return {
    providerTaskId: pythonResult.providerTaskId,
    manifest: pythonResult.manifest,
    artifacts,
  }
}
