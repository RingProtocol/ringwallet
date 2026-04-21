import type { ChainTestProfile } from './types'

export const bnbProfile: ChainTestProfile = {
  id: 'bnb',
  displayName: 'BNB Smart Chain',
  chainId: 56,
  defaultAnvilPort: 8568,
  buildForkRpcUrl() {
    return null
  },
}

export const bnbTestnetProfile: ChainTestProfile = {
  id: 'bnb-testnet',
  displayName: 'BNB Testnet',
  chainId: 97,
  defaultAnvilPort: 8569,
  buildForkRpcUrl() {
    return null
  },
}
