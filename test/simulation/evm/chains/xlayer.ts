import type { ChainTestProfile } from './types'

export const xlayerProfile: ChainTestProfile = {
  id: 'xlayer',
  displayName: 'X Layer',
  chainId: 196,
  defaultAnvilPort: 8553,
  buildForkRpcUrl() {
    return null
  },
}

export const xlayerTestnetProfile: ChainTestProfile = {
  id: 'xlayer-testnet',
  displayName: 'X Layer Testnet',
  chainId: 195,
  defaultAnvilPort: 8554,
  buildForkRpcUrl() {
    return null
  },
}
