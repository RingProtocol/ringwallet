import type { ChainTestProfile } from './types'

export const baseProfile: ChainTestProfile = {
  id: 'base',
  displayName: 'Base',
  chainId: 8453,
  defaultAnvilPort: 8560,
  buildForkRpcUrl() {
    return null
  },
}

export const baseSepoliaProfile: ChainTestProfile = {
  id: 'base-sepolia',
  displayName: 'Base Sepolia',
  chainId: 84532,
  defaultAnvilPort: 8561,
  buildForkRpcUrl() {
    return null
  },
}
