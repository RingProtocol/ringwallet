import type { ChainTestProfile } from './types'

export const lineaProfile: ChainTestProfile = {
  id: 'linea',
  displayName: 'Linea',
  chainId: 59144,
  defaultAnvilPort: 8564,
  buildForkRpcUrl() {
    return null
  },
}

export const lineaSepoliaProfile: ChainTestProfile = {
  id: 'linea-sepolia',
  displayName: 'Linea Sepolia',
  chainId: 59141,
  defaultAnvilPort: 8565,
  buildForkRpcUrl() {
    return null
  },
}
