import Link from "next/link"

import { OnChainAgreement } from "@/types/agreement"
import { cn } from "@/lib/utils"

import { Badge } from "./ui/badge"
import { buttonVariants } from "./ui/button"

export function MarketCard({
  market,
  children,
  className,
}: {
  market: OnChainAgreement
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      key={market.id}
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-card p-4 text-sm",
        className
      )}
    >
      <div className="flex justify-between">
        <Badge>
          {market.resolvedAt
            ? "Resolved"
            : market.resolveAt < new Date()
              ? "Resolving Soon"
              : market.betEndAt < new Date()
                ? "Betting Ended"
                : "Open"}
        </Badge>
        {market.publicKey && <Badge variant="outline">Private</Badge>}
      </div>
      <div className="text-lg font-bold">{market.title}</div>
      <div className="text-muted-foreground">{market.description}</div>
      <div className="flex-1" />
      {children ?? (
        <Link
          href={`/market/${market.id}`}
          className={buttonVariants({
            variant: "outline",
          })}
        >
          Go To Market
        </Link>
      )}
    </div>
  )
}
