import type { ChainTestProfile } from './types'

export const blastProfile: ChainTestProfile = {
  id: 'blast',
  displayName: 'Blast',
  chainId: 81457,
  defaultAnvilPort: 8576,
  buildForkRpcUrl() {
    return null
  },
}

export const blastSepoliaProfile: ChainTestProfile = {
  id: 'blast-sepolia',
  displayName: 'Blast Sepolia',
  chainId: 168587773,
  defaultAnvilPort: 8577,
  buildForkRpcUrl() {
    return null
  },
}
