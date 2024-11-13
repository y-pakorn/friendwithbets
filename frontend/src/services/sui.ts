import { SuiClient } from "@mysten/sui/client"

import { OnChainAgreement } from "@/types/agreement"

export const stringToBytes = (str: string) => new TextEncoder().encode(str)
export const stringToNumberArray = (str: string) =>
  Array.from(stringToBytes(str))

const fieldToMarket = (fields: any): OnChainAgreement => ({
  id: fields.id.id,
  title: fields.title,
  description: fields.description,
  rules: fields.rules,
  outcomes: fields.outcomes.map((f: any) => f.fields),
  publicKey: fields.public_key ? Uint8Array.from(fields.public_key) : undefined,
  relevantInformation: fields.relevant_information,
  resolveAt: new Date(Number(fields.resolve_at)),
  resolveQuery: fields.resolve_query,
  resolveSources: fields.resolve_source || [],
  resolvedAt: Number(fields.resolved_at)
    ? new Date(Number(fields.resolved_at))
    : undefined,
  resolvedOutcome: fields.resolved_outcome,
  resolvedProof: fields.resolved_proof,
  startAt: new Date(Number(fields.start_at)),
  betEndAt: new Date(Number(fields.bet_end_at)),
  betsAgg: fields.bets_agg,
  betsTotal: fields.bets_total,
  creator: fields.creator,
})

export const getMarkets = async (marketIds: string[], client: SuiClient) => {
  const resp = await client.multiGetObjects({
    ids: marketIds,
    options: {
      showContent: true,
    },
  })

  return resp.map((r) => {
    const fields = (r.data?.content as any).fields
    return fieldToMarket(fields)
  }) as OnChainAgreement[]
}

export const getMarketFetch = async (marketId: string, rpcUrl: string) => {
  try {
    const fields = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getObject",
        params: [
          marketId,
          {
            showType: false,
            showOwner: false,
            showPreviousTransaction: false,
            showDisplay: false,
            showContent: true,
            showBcs: false,
            showStorageRebate: false,
          },
        ],
      }),
    })
      .then((d) => d.json())
      .then((d) => d.result.data.content.fields)

    return fieldToMarket(fields)
  } catch (e) {
    return null
  }
}
