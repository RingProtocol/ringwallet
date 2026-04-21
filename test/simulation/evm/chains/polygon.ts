import type { ChainTestProfile } from './types'

export const polygonProfile: ChainTestProfile = {
  id: 'polygon',
  displayName: 'Polygon',
  chainId: 137,
  defaultAnvilPort: 8550,
  buildForkRpcUrl() {
    return null
  },
}

export const polygonAmoyProfile: ChainTestProfile = {
  id: 'polygon-amoy',
  displayName: 'Polygon Amoy',
  chainId: 80002,
  defaultAnvilPort: 8559,
  buildForkRpcUrl() {
    return null
  },
}
