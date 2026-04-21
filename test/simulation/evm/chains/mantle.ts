import type { ChainTestProfile } from './types'

export const mantleProfile: ChainTestProfile = {
  id: 'mantle',
  displayName: 'Mantle',
  chainId: 5000,
  defaultAnvilPort: 8574,
  buildForkRpcUrl() {
    return null
  },
}

export const mantleSepoliaProfile: ChainTestProfile = {
  id: 'mantle-sepolia',
  displayName: 'Mantle Sepolia',
  chainId: 5003,
  defaultAnvilPort: 8575,
  buildForkRpcUrl() {
    return null
  },
}
