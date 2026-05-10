import type { ChainTestProfile } from './types'

export const zksyncProfile: ChainTestProfile = {
  id: 'zksync',
  displayName: 'zkSync Era',
  chainId: 324,
  defaultAnvilPort: 8562,
  buildForkRpcUrl() {
    return null
  },
}

export const zksyncSepoliaProfile: ChainTestProfile = {
  id: 'zksync-sepolia',
  displayName: 'zkSync Sepolia',
  chainId: 300,
  defaultAnvilPort: 8563,
  buildForkRpcUrl() {
    return null
  },
}
