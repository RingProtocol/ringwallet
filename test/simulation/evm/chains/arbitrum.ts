import type { ChainTestProfile } from './types'

export const arbitrumProfile: ChainTestProfile = {
  id: 'arbitrum',
  displayName: 'Arbitrum One',
  chainId: 42161,
  defaultAnvilPort: 8549,
  buildForkRpcUrl() {
    return null
  },
}

export const arbitrumSepoliaProfile: ChainTestProfile = {
  id: 'arbitrum-sepolia',
  displayName: 'Arbitrum Sepolia',
  chainId: 421614,
  defaultAnvilPort: 8558,
  buildForkRpcUrl() {
    return null
  },
}
