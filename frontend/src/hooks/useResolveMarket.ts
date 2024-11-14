import { useQuery } from "@tanstack/react-query"

export const useResolveMarket = (
  marketId: string,
  trigger?: boolean,
  successCallback?: () => void
) => {
  const data = useQuery({
    queryKey: ["resolve-market", marketId, trigger],
    queryFn: async () => {
      if (!trigger) return null
      console.log("Running resolve market query")
      const response = await fetch(`/api/resolve?id=${marketId}`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.type === "success") {
        successCallback?.()
      }

      return data
    },
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })
  return data
}
