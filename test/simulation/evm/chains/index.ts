import type { ChainTestProfile } from './types'
import { sepoliaProfile } from './sepolia'
import { hyperliquidProfile } from './hyperliquid'
import { optimismProfile } from './optimism'
import { arbitrumProfile } from './arbitrum'
import { polygonProfile } from './polygon'
import { avalancheProfile, fujiProfile } from './avalanche'
import { xlayerProfile, xlayerTestnetProfile } from './xlayer'
import { plasmaProfile, plasmaTestnetProfile } from './plasma'

const registry: Record<string, ChainTestProfile> = {
  sepolia: sepoliaProfile,
  hyperliquid: hyperliquidProfile,
  optimism: optimismProfile,
  arbitrum: arbitrumProfile,
  polygon: polygonProfile,
  avalanche: avalancheProfile,
  fuji: fujiProfile,
  xlayer: xlayerProfile,
  'xlayer-testnet': xlayerTestnetProfile,
  plasma: plasmaProfile,
  'plasma-testnet': plasmaTestnetProfile,
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
  avalancheProfile,
  fujiProfile,
  xlayerProfile,
  xlayerTestnetProfile,
  plasmaProfile,
  plasmaTestnetProfile,
}
