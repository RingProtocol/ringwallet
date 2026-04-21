import type { ChainTestProfile } from './types'

export const optimismProfile: ChainTestProfile = {
  id: 'optimism',
  displayName: 'Optimism',
  chainId: 10,
  defaultAnvilPort: 8548,
  buildForkRpcUrl() {
    return null
  },
}

export const opSepoliaProfile: ChainTestProfile = {
  id: 'op-sepolia',
  displayName: 'OP Sepolia',
  chainId: 11155420,
  defaultAnvilPort: 8557,
  buildForkRpcUrl() {
    return null
  },
}
