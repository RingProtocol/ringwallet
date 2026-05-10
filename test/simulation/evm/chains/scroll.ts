import type { ChainTestProfile } from './types'

export const scrollProfile: ChainTestProfile = {
  id: 'scroll',
  displayName: 'Scroll',
  chainId: 534352,
  defaultAnvilPort: 8566,
  buildForkRpcUrl() {
    return null
  },
}

export const scrollSepoliaProfile: ChainTestProfile = {
  id: 'scroll-sepolia',
  displayName: 'Scroll Sepolia',
  chainId: 534351,
  defaultAnvilPort: 8567,
  buildForkRpcUrl() {
    return null
  },
}
