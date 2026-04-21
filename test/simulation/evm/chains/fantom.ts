import type { ChainTestProfile } from './types'

export const fantomProfile: ChainTestProfile = {
  id: 'fantom',
  displayName: 'Fantom',
  chainId: 250,
  defaultAnvilPort: 8580,
  buildForkRpcUrl() {
    return null
  },
}

export const fantomTestnetProfile: ChainTestProfile = {
  id: 'fantom-testnet',
  displayName: 'Fantom Testnet',
  chainId: 4002,
  defaultAnvilPort: 8581,
  buildForkRpcUrl() {
    return null
  },
}
