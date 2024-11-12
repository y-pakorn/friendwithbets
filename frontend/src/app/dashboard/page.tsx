"use client"

import { useState } from "react"
import {
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

import { OnChainAgreement } from "@/types/agreement"
import { contract } from "@/config/contract"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  const account = useCurrentAccount()

  const [page, setPage] = useState(1)
  const client = useSuiClient()

  const getMarkets = async (marketIds: string[]) => {
    const resp = await client.multiGetObjects({
      ids: marketIds,
      options: {
        showContent: true,
      },
    })

    return resp.map((r) => {
      const fields = (r.data?.content as any).fields
      console.log(fields)
      return {
        id: fields.id.id,
        title: fields.title,
        description: fields.description,
        outcomes: fields.outcomes.map((f: any) => f.fields),
        publicKey: fields.public_key
          ? Uint8Array.from(fields.public_key)
          : undefined,
        relevantInformation: fields.relevant_information,
        resolveAt: new Date(Number(fields.resolve_at)),
        resolveQuery: fields.resolve_query,
        resolveSources: fields.resolve_sources || [],
        resolvedAt: Number(fields.resolved_at)
          ? new Date(Number(fields.resolved_at))
          : undefined,
        resolvedOutcome: fields.resolved_outcome,
        resolvedProof: fields.resolved_proof,
        startAt: new Date(Number(fields.start_at)),
        betEndAt: new Date(Number(fields.bet_end_at)),
        betsAgg: fields.bets_agg,
        betsTotal: fields.bets_total,
      }
    }) as OnChainAgreement[]
  }

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

      return await getMarkets(marketIds)
    },
  })

  console.log(markets.data)

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
      className="space-y-2 rounded-md bg-primary-foreground p-4 text-sm"
    >
      <Badge>
        {market.resolvedAt
          ? "Resolved"
          : market.betEndAt < new Date()
            ? "Betting Ended"
            : "Open"}
      </Badge>
      <div className="text-lg font-bold">{market.title}</div>
      <div className="text-muted-foreground">{market.description}</div>
    </div>
  )
}
