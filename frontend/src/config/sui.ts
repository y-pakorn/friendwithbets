import { createNetworkConfig } from "@mysten/dapp-kit"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"

export const networkConfig = {
  devnet: { url: getFullnodeUrl("devnet") },
}

export const getSuiClient = () => {
  return new SuiClient({
    url: networkConfig.devnet.url,
  })
}

export const getSuiNetworkUrl = () => {
  return networkConfig.devnet.url
}
