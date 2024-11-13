"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { WalletAccount } from "@mysten/wallet-standard"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import _ from "lodash"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AgreementBet, OnChainAgreement } from "@/types/agreement"
import { contract } from "@/config/contract"
import { formatSuiDecimal } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { SuiIcon } from "@/components/sui-icon"
import { getMarkets } from "@/services/sui"

export default function Home() {
  const account = useCurrentAccount()

  const client = useSuiClient()

  const bets = useQuery({
    queryKey: ["my-bets", account?.address],
    queryFn: async () => {
      if (!account?.address) return null
      const query = (cursor?: string) =>
        client.getOwnedObjects({
          owner: account.address,
          limit: 50,
          cursor,
          options: {
            showContent: true,
          },
          filter: {
            StructType: `${contract.core}::core::Bet`,
          },
        })

      let cursor: string | undefined = undefined
      const bets = []
      while (true) {
        const resp = await query(cursor)
        bets.push(...resp.data.map((bet) => (bet.data?.content as any).fields))
        if (!resp.hasNextPage) break
        cursor = resp.nextCursor || undefined
      }
      const marketIds = _.chain(bets).map("market_id").uniq().value()
      const markets = await getMarkets(marketIds, client).then((markets) =>
        _.keyBy(markets, "id")
      )

      return _.chain(bets)
        .groupBy("market_id")
        .mapValues((bets, marketId) => {
          return {
            market: markets[marketId],
            bets: bets.map(
              (bet) =>
                ({
                  id: bet.id.id,
                  marketId: bet.market_id,
                  amount: bet.amount,
                  outcomeIndex: Number(bet.outcome),
                  betAt: new Date(Number(bet.bet_at)),
                  claimedAt:
                    bet.claimed_at === "0"
                      ? undefined
                      : new Date(Number(bet.claimed_at)),
                }) as AgreementBet
            ),
          }
        })
        .values()
        .value()
    },
  })

  return (
    <main className="container flex min-h-screen flex-col gap-4 py-8">
      <h1 className="text-3xl font-bold">My Bets</h1>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {account &&
          bets.data?.map(({ market, bets }) => (
            <Market
              key={market.id}
              market={market}
              bets={bets}
              account={account}
            ></Market>
          ))}
      </div>
    </main>
  )
}

const Market = ({
  market,
  bets,
  account,
}: {
  market: OnChainAgreement
  bets: AgreementBet[]
  account: WalletAccount
}) => {
  const qClient = useQueryClient()

  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const client = useSuiClient()

  const canClaim = _.chain(bets)
    .some((b) => b.outcomeIndex === market.resolvedOutcome && !b.claimedAt)
    .value()

  const [isClaiming, setIsClaiming] = useState(false)
  const claim = async () => {
    const winnerBets = bets.filter(
      (bet) => bet.outcomeIndex === market.resolvedOutcome && !bet.claimedAt
    )
    if (!winnerBets.length) return
    setIsClaiming(true)
    const tb = new Transaction()
    const coins = winnerBets.map((bet) => {
      const [coin] = tb.moveCall({
        target: `${contract.core}::core::Claim`,
        arguments: [tb.object(market.id), tb.object(bet.id), tb.object("0x6")],
      })
      return coin
    })
    const coin =
      coins.length === 1 ? coins : tb.mergeCoins(coins[0], coins.slice(1))
    tb.transferObjects(coin, account.address)

    const signed = await signAndExecute({
      transaction: tb,
    })

    const { errors } = await client.waitForTransaction({
      digest: signed.digest,
      options: {
        showEffects: true,
      },
    })

    if (errors) {
      toast.error("Failed to claim bet returns", {
        description: errors.join(", "),
      })
      return
    }

    qClient.refetchQueries({
      predicate: (q) => q.queryKey[0] === "my-bets",
    })
    setIsClaiming(false)
  }

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
      <div className="space-y-2">
        {bets.map((bet) => (
          <div key={bet.id} className="rounded-md border bg-card p-2 text-sm">
            <div className="truncate text-xs text-muted-foreground">
              {bet.id.slice(0, 16)}...
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {market.outcomes[bet.outcomeIndex].title}
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                {formatSuiDecimal(bet.amount)} <SuiIcon />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link
        href={`/market/${market.id}`}
        className={buttonVariants({
          variant: "outline",
        })}
      >
        Go To Market
      </Link>
      <Button
        disabled={!market.resolvedAt || !canClaim || isClaiming}
        onClick={claim}
      >
        Claim {isClaiming && <Loader2 className="size-4 animate-spin" />}
      </Button>
    </div>
  )
}
