import { PublicKey } from "@solana/web3.js"

export interface Creator {
  name: string
  site: string
}

export interface UserToken {
  name: string
  symbol: string
  decimals: number
  description: string
  uiAmount: number
  image: string
  extensions?: Extension
  tags?: string[]
  creator?: Creator
  solAmount: number
  tokenAmountToPutInPool: number
}

interface Extension {
  website?: string
  twitter?: string
  telegram?: string
}

export interface Metadata {
  name: string
  symbol: string
  description: string
  image: string
  extensions?: Extension
  tags?: string[]
  creator?: Creator
}

export interface HolderInfo {
  pubkey: PublicKey,
  amount: bigint
}
