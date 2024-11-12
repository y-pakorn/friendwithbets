"use client"

import { useState } from "react"
import Link from "next/link"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

import { OnChainAgreement } from "@/types/agreement"
import { contract } from "@/config/contract"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
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
          <Market key={market.id} market={market} />
        ))}
      </div>
    </main>
  )
}

const Market = ({ market }: { market: OnChainAgreement }) => {
  return (
    <div
      key={market.id}
      className="flex flex-col gap-2 rounded-md border bg-card p-4 text-sm"
    >
      <div className="flex justify-between">
        <Badge>
          {market.resolvedAt
            ? "Resolved"
            : market.betEndAt < new Date()
              ? "Betting Ended"
              : "Open"}
        </Badge>
        {market.publicKey && <Badge variant="outline">Private</Badge>}
      </div>
      <div className="text-lg font-bold">{market.title}</div>
      <div className="text-muted-foreground">{market.description}</div>
      <div className="flex-1" />
      <Link
        href={`/market/${market.id}`}
        className={buttonVariants({
          variant: "outline",
        })}
      >
        Go To Market
      </Link>
    </div>
  )
}
