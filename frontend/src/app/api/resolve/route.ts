import { NextRequest, NextResponse } from "next/server"
import { bcs } from "@mysten/sui/bcs"
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1"
import { Transaction } from "@mysten/sui/transactions"

import { env } from "@/env.mjs"
import { contract } from "@/config/contract"
import { getSuiClient } from "@/config/sui"
import { getPredictionResolvedOutcome } from "@/services/ai"
import { getMarkets, stringToBytes } from "@/services/sui"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get("id")
  if (!marketId)
    return NextResponse.json("Market ID is required", { status: 400 })

  const client = getSuiClient()
  const [market] = await getMarkets([marketId], client)

  if (market.resolvedAt) {
    return NextResponse.json({
      type: "resolved",
      message: "Market already resolved",
    })
  }

  const keypair = Secp256k1Keypair.fromSecretKey(env.ADMIN_PRIVATE_KEY)

  const outcome = await getPredictionResolvedOutcome(market)
  if (!outcome) {
    return NextResponse.json("No outcome found", { status: 400 })
  }

  const tb = new Transaction()
  tb.moveCall({
    target: `${contract.core}::core::resolve`,
    arguments: [
      tb.object(marketId),
      tb.pure(bcs.U64.serialize(outcome.outcomeIndex)),
      tb.pure(
        bcs.vector(bcs.U8).serialize(stringToBytes(JSON.stringify(outcome)))
      ),
      tb.object("0x6"),
    ],
  })

  const tx = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tb,
    options: {
      showEffects: true,
    },
  })

  if (tx.errors) {
    return NextResponse.json({
      type: "error",
      message: "Resolve transaction failed",
      outcome,
      errors: tx.errors,
    })
  } else {
    return NextResponse.json({
      type: "success",
      message: "Resolve transaction successful",
      outcome,
      hash: tx.digest,
    })
  }
}
