"use client"

import { useState } from "react"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

import { contract } from "@/config/contract"
import { MarketCard } from "@/components/market-card"
import { getMarkets } from "@/services/sui"

export default function Home() {
  const [page, setPage] = useState(1)
  const client = useSuiClient()

  const markets = useQuery({
    queryKey: ["markets", page],
    queryFn: async () => {
      const marketIds = await client
        .queryEvents({
          query: {
            MoveEventType: `${contract.core}::core::MarketCreated`,
          },
          limit: 1000,
        })
        .then((d) => d.data.map((e) => (e.parsedJson as any).market_id))

      return await getMarkets(marketIds, client)
    },
  })

  return (
    <main className="container flex min-h-screen flex-col gap-4 py-8">
      <h1 className="text-3xl font-bold">All Markets</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.data?.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </main>
  )
}
