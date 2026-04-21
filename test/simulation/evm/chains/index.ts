import type { ChainTestProfile } from './types'
import { sepoliaProfile } from './sepolia'
import { hyperliquidProfile } from './hyperliquid'

const registry: Record<string, ChainTestProfile> = {
  sepolia: sepoliaProfile,
  hyperliquid: hyperliquidProfile,
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

export { sepoliaProfile, hyperliquidProfile }
