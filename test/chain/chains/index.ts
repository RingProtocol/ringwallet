import type { ChainTestProfile } from './types'
import { sepoliaProfile } from './sepolia'

const registry: Record<string, ChainTestProfile> = {
  sepolia: sepoliaProfile,
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

export { sepoliaProfile }
