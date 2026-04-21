import type { ChainTestProfile } from './types'
import { sepoliaProfile } from './sepolia'
import { hyperliquidProfile } from './hyperliquid'
import { optimismProfile } from './optimism'
import { arbitrumProfile } from './arbitrum'
import { polygonProfile } from './polygon'

const registry: Record<string, ChainTestProfile> = {
  sepolia: sepoliaProfile,
  hyperliquid: hyperliquidProfile,
  optimism: optimismProfile,
  arbitrum: arbitrumProfile,
  polygon: polygonProfile,
}

export function getChainProfile(chainId: string): ChainTestProfile {
  const p = registry[chainId]
  if (!p) {
    throw new Error(
      `Unknown test chain "${chainId}". Known: ${listChainIds().join(', ')}`
    )
  }
  return p
}

export function listChainIds(): string[] {
  return Object.keys(registry)
}

export {
  sepoliaProfile,
  hyperliquidProfile,
  optimismProfile,
  arbitrumProfile,
  polygonProfile,
}
