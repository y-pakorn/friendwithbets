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
import { networkConfig } from "@/config/sui"

export const { networkConfig: nc } = createNetworkConfig(networkConfig)

const queryClient = new QueryClient()

const WalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={nc} defaultNetwork="devnet">
        <SuiWalletProvider
          autoConnect
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
