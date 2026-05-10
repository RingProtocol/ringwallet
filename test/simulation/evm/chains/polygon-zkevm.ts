import type { ChainTestProfile } from './types'

export const polygonZkevmProfile: ChainTestProfile = {
  id: 'polygon-zkevm',
  displayName: 'Polygon zkEVM',
  chainId: 1101,
  defaultAnvilPort: 8584,
  buildForkRpcUrl() {
    return null
  },
}

export const polygonZkevmCardonaProfile: ChainTestProfile = {
  id: 'polygon-zkevm-cardona',
  displayName: 'Polygon zkEVM Cardona',
  chainId: 2442,
  defaultAnvilPort: 8585,
  buildForkRpcUrl() {
    return null
  },
}
