import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
  },
  server: {
    OPENROUTER_URL: z.string().min(1),
    OPENROUTER_API_KEY: z.string().min(1),
    SERPER_API_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    OPENROUTER_URL: process.env.OPENROUTER_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    SERPER_API_KEY: process.env.SERPER_API_KEY,
  },
})
