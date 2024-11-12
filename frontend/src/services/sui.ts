import { SuiClient } from "@mysten/sui/client"

import { OnChainAgreement } from "@/types/agreement"

export const stringToBytes = (str: string) => new TextEncoder().encode(str)
export const stringToNumberArray = (str: string) =>
  Array.from(stringToBytes(str))

export const getMarkets = async (marketIds: string[], client: SuiClient) => {
  const resp = await client.multiGetObjects({
    ids: marketIds,
    options: {
      showContent: true,
    },
  })

  return resp.map((r) => {
    const fields = (r.data?.content as any).fields
    return {
      id: fields.id.id,
      title: fields.title,
      description: fields.description,
      rules: fields.rules,
      outcomes: fields.outcomes.map((f: any) => f.fields),
      publicKey: fields.public_key
        ? Uint8Array.from(fields.public_key)
        : undefined,
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
    }
  }) as OnChainAgreement[]
}
