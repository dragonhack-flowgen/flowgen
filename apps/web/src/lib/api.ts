import { hc } from "hono/client"
import type { AppType } from "backend/app"

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001"

export const RECORDER_API_URL =
  import.meta.env.VITE_RECORDER_API_URL ?? "http://localhost:8002"

export const client = hc<AppType>(API_BASE_URL)

export async function throwOnError(res: Response) {
  if (!res.ok) {
    let message = `API ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      message = body.error ? body.error : `${message}: Request failed`
    } catch {
      const body = await res.text().catch(() => "Unknown error")
      message = `${message}: ${body}`
    }
    throw new Error(message)
  }
}
