import { SiteConfig } from "@/types"

import { env } from "@/env.mjs"

export const siteConfig: SiteConfig = {
  name: "Friend With Bets",
  author: "",
  description: "Bet Anything, Anywhere, with Anyone, Powered by Sui.",
  keywords: [],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "",
  },
  links: {
    github: "",
  },
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/api/market-thumb?title=Bet%20Anything,%20Anywhere,%20with%20Anyone&large=true`,
}
