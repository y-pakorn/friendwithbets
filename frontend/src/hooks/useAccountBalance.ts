import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit"

export const useAccountBalance = (coinType: string = "0x2::sui::SUI") => {
  const account = useCurrentAccount()
  const balance = useSuiClientQuery("getBalance", {
    owner: account?.address || "",
    coinType,
  })
  return balance
}
