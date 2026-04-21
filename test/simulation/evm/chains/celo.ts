import type { ChainTestProfile } from './types'

export const celoProfile: ChainTestProfile = {
  id: 'celo',
  displayName: 'Celo',
  chainId: 42220,
  defaultAnvilPort: 8570,
  buildForkRpcUrl() {
    return null
  },
}

export const celoAlfajoresProfile: ChainTestProfile = {
  id: 'celo-alfajores',
  displayName: 'Celo Alfajores',
  chainId: 44787,
  defaultAnvilPort: 8571,
  buildForkRpcUrl() {
    return null
  },
}
