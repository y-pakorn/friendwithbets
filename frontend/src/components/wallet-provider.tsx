"use client"

import { ReactNode } from "react"
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit"
import { getFullnodeUrl } from "@mysten/sui/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { siteConfig } from "@/config/site"

const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl("devnet") },
})
const queryClient = new QueryClient()

const WalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
        <SuiWalletProvider
          stashedWallet={{
            name: siteConfig.name,
          }}
        >
          {children}
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
WalletProvider.displayName = "WalletProvider"

export { WalletProvider }
