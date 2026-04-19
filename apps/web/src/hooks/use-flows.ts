import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"
import { client, throwOnError } from "@/lib/api"

type Flow = InferResponseType<typeof client.flows.$get>[number]
type FlowStatus = Flow["status"]

const flowKeys = {
  all: ["flows"] as const,
  detail: (id: string) => ["flows", id] as const,
}

function isFlowInProgress(flow: Pick<Flow, "status"> | undefined | null) {
  return flow?.status === "pending" || flow?.status === "running"
}

export type { Flow, FlowStatus }

export function useFlows() {
  return useQuery({
    queryKey: flowKeys.all,
    queryFn: async () => {
      const res = await client.flows.$get()
      await throwOnError(res)
      return res.json()
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
      await throwOnError(res)
      return (await res.json()) as Flow
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data || !("status" in data)) return false
      return isFlowInProgress(data) ? 2000 : false
    },
  })
}

export function useCreateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await client.flows.$post({ json: data })
      await throwOnError(res)
      return res.json()
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
      await throwOnError(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
      queryClient.invalidateQueries({
        queryKey: flowKeys.detail(variables.id),
      })
    },
  })
}

export function useApproveFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.flows[":id"].approve.$post({
        param: { id },
      })
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
    },
  })
}

export function useReExploreFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.flows[":id"]["re-explore"].$post({
        param: { id },
      })
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
    },
  })
}

export function useDismissFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.flows[":id"].dismiss.$post({
        param: { id },
      })
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
    },
  })
}

export function useFlagFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string
      reason?: string
    }) => {
      const res = await client.flows[":id"].flag.$post({
        param: { id },
        json: { reason },
      })
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowKeys.all })
    },
  })
}

export function useDiscoverFlows() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await client.flows.discover.$post()
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      // Delay refetch to give the backend time to start discovery
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: flowKeys.all })
      }, 5000)
    },
  })
}
