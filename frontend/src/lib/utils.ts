import { SUI_DECIMALS } from "@mysten/sui/utils"
import { BigNumber } from "bignumber.js"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatSuiDecimal = (value: string | number) => {
  return (Number(value) / Math.pow(10, SUI_DECIMALS)).toFixed(2)
}

export const mistToSui = (value?: string | number | BigNumber) => {
  return BigNumber(value || 0).shiftedBy(-SUI_DECIMALS)
}

export const suiToMist = (value?: string | number | BigNumber) => {
  return BigNumber(value || 0).shiftedBy(SUI_DECIMALS)
}
