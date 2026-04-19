import { hc } from "hono/client"
import type { AppType } from "backend/app"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export const client = hc<AppType>(API_BASE_URL)
