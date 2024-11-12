import { z } from "zod"

export const agreementSchema = z.object({
  title: z.string().describe("The agreement to be resolved"),
  rules: z
    .string()
    .describe(
      "The rules of the agreement, include how the agreement will be resolved."
    ),
  description: z.string().describe("The description of the agreement."),
  relevantInformation: z
    .string()
    .describe(
      "The relevant information of the agreement, for example, if the agreement is about price, the info must include the current price as a reference."
    ),
  startAt: z
    .string()
    .describe(
      "The date time that the agreement is created, in UTC ISO format."
    ),
  betEndAt: z
    .string()
    .describe(
      "The date time to end the betting, in UTC ISO format. Normally after the startAt by 1 day. Otherwise it need to be a appropriate time (just a short period). You might ask the user for the time."
    ),
  resolveAt: z
    .string()
    .describe("The date time to resolve the agreement, in UTC ISO format."),
  resolveQuery: z
    .string()
    .describe(
      `The query that will be ran to resolve the agreement at the "resolveAt" datetime. The query must be able to be answered by searching the internet.`
    ),
  resolveSources: z
    .array(z.string())
    .describe("The possible sources URL that the query can be answered from."),
  outcomes: z
    .array(
      z.object({
        title: z.string().describe("The title of the outcome"),
        description: z.string().describe("The description of the outcome"),
      })
    )
    .describe("The outcomes to be resolved"),
})

export type Agreement = z.infer<typeof agreementSchema>

export type OnChainAgreement = {
  id: string
  title: string
  description: string
  outcomes: {
    title: string
    description: string
  }[]
  publicKey?: Uint8Array
  relevantInformation: string
  resolveAt: Date
  resolveQuery: string
  resolveSources: string[]
  resolvedAt?: Date
  resolvedOutcome: number
  resolvedProof: string
  startAt: Date
  betEndAt: Date
  betsAgg: number
  betsTotal: number
}
