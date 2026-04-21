import type { ChainTestProfile } from './types'

export const avalancheProfile: ChainTestProfile = {
  id: 'avalanche',
  displayName: 'Avalanche C-Chain',
  chainId: 43114,
  defaultAnvilPort: 8551,
  buildForkRpcUrl() {
    return null
  },
}

export const fujiProfile: ChainTestProfile = {
  id: 'fuji',
  displayName: 'Avalanche Fuji Testnet',
  chainId: 43113,
  defaultAnvilPort: 8552,
  buildForkRpcUrl() {
    return null
  },
}
