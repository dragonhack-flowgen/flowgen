import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client, throwOnError } from "@/lib/api"

const settingsKeys = {
  all: ["settings"] as const,
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const res = await client.settings.$get()
      await throwOnError(res)
      return res.json()
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { gitUrl: string }) => {
      const res = await client.settings.$put({ json: data })
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useDeleteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await client.settings.$delete()
      await throwOnError(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
