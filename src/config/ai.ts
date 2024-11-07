import { createOpenAI } from "@ai-sdk/openai"

import { env } from "@/env.mjs"

export const openrouter = createOpenAI({
  name: "openrouter",
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENROUTER_URL,
})
