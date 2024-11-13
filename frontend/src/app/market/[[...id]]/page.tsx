import { Metadata } from "next"

import { env } from "@/env.mjs"
import { getSuiNetworkUrl } from "@/config/sui"
import { formatSuiDecimal } from "@/lib/utils"
import { getMarketFetch } from "@/services/sui"

import { MarketDisplay } from "./market-display"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>
}): Promise<Metadata> {
  const id = (await params).id[0]
  if (!id)
    return {
      title: "Market not found",
    }

  const market = await getMarketFetch(id, getSuiNetworkUrl())
  if (!market)
    return {
      title: "Market not found",
    }

  return {
    title: market.title,
    description: market.description,
    openGraph: {
      images: [
        {
          url: `${env.NEXT_PUBLIC_APP_URL}/api/market-thumb?title=${market.title}&description=${market.description}&locked=${!!market.publicKey}&total=${formatSuiDecimal(market.betsTotal)}`,
          width: 1200,
          height: 630,
          alt: market.title,
        },
      ],
    },
  }
}

export default function Home() {
  return <MarketDisplay />
}
