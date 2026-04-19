import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/api"
import type { Flow } from "@/types/flow"

const flowKeys = {
  all: ["flows"] as const,
  detail: (id: string) => ["flows", id] as const,
}

function isFlowInProgress(flow: Pick<Flow, "status"> | undefined | null) {
  return flow?.status === "pending" || flow?.status === "running"
}

async function handleResponse<T>(res: Response): Promise<T> {
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
  return res.json() as Promise<T>
}

export function useFlows() {
  return useQuery({
    queryKey: flowKeys.all,
    queryFn: async () => {
      const res = await client.flows.$get()
      return handleResponse<Flow[]>(res)
    },
    refetchInterval: (query) => {
      const flows = query.state.data
      return flows?.some((flow) => isFlowInProgress(flow)) ? 2000 : false
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
    refetchInterval: (query) =>
      isFlowInProgress(query.state.data) ? 2000 : false,
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
      return handleResponse<{ gitUrl: string | null; lastExploredCommit: string | null }>(res)
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

export function useDeleteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await client.settings.$delete()
      return handleResponse<{ gitUrl: null }>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}
