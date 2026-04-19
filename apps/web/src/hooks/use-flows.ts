import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/api"
import type { Flow } from "@/types/flow"

const flowKeys = {
  all: ["flows"] as const,
  detail: (id: string) => ["flows", id] as const,
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error")
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function useFlows() {
  return useQuery({
    queryKey: flowKeys.all,
    queryFn: async () => {
      const res = await client.flows.$get()
      return handleResponse<Flow[]>(res)
    },
  })
}

export function useFlow(id: string) {
  return useQuery({
    queryKey: flowKeys.detail(id),
    queryFn: async () => {
      const res = await client.flows[":id"].$get({
        param: { id },
      })
      return handleResponse<Flow>(res)
    },
    enabled: !!id,
  })
}

export function useCreateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await client.flows.$post({ json: data })
      return handleResponse<{ id: string; status: string }>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
    },
  })
}

export function useUpdateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      guide?: string
      userDocs?: string
    }) => {
      const res = await client.flows[":id"].$put({
        param: { id },
        json: data,
      })
      return handleResponse<Flow>(res)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
      queryClient.invalidateQueries({
        queryKey: flowKeys.detail(variables.id),
      })
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await client.settings.$get()
      return handleResponse<{ gitUrl: string | null }>(res)
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { gitUrl: string }) => {
      const res = await client.settings.$put({ json: data })
      return handleResponse<{ gitUrl: string }>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}
