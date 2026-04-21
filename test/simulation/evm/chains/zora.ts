import type { ChainTestProfile } from './types'

export const zoraProfile: ChainTestProfile = {
  id: 'zora',
  displayName: 'Zora',
  chainId: 7777777,
  defaultAnvilPort: 8578,
  buildForkRpcUrl() {
    return null
  },
}

export const zoraSepoliaProfile: ChainTestProfile = {
  id: 'zora-sepolia',
  displayName: 'Zora Sepolia',
  chainId: 999999999,
  defaultAnvilPort: 8579,
  buildForkRpcUrl() {
    return null
  },
}
