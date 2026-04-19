import { hc } from "hono/client"
import type { AppType } from "backend/app"

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001"

export const RECORDER_API_URL =
  import.meta.env.VITE_RECORDER_API_URL ?? "http://localhost:8002"

export const client = hc<AppType>(API_BASE_URL)
