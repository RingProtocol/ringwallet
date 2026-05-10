import type { ChainTestProfile } from './types'

export const plasmaProfile: ChainTestProfile = {
  id: 'plasma',
  displayName: 'Plasma',
  chainId: 9745,
  defaultAnvilPort: 8555,
  buildForkRpcUrl() {
    return null
  },
}

export const plasmaTestnetProfile: ChainTestProfile = {
  id: 'plasma-testnet',
  displayName: 'Plasma Testnet',
  chainId: 9746,
  defaultAnvilPort: 8556,
  buildForkRpcUrl() {
    return null
  },
}
