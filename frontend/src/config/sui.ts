import { createNetworkConfig } from "@mysten/dapp-kit"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { getFaucetHost, requestSuiFromFaucetV0 } from "@mysten/sui/faucet"

export const networkConfig = {
  devnet: { url: getFullnodeUrl("devnet"), faucetUrl: getFaucetHost("devnet") },
}

export const getSuiClient = () => {
  return new SuiClient({
    url: networkConfig.devnet.url,
  })
}

export const requestSuiFromFaucet = async (address: string) => {
  return requestSuiFromFaucetV0({
    host: networkConfig.devnet.faucetUrl,
    recipient: address,
  })
}

export const getSuiNetworkUrl = () => {
  return networkConfig.devnet.url
}
