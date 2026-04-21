import type { ChainTestProfile } from './types'

export const moonbeamProfile: ChainTestProfile = {
  id: 'moonbeam',
  displayName: 'Moonbeam',
  chainId: 1284,
  defaultAnvilPort: 8582,
  buildForkRpcUrl() {
    return null
  },
}

export const moonbaseAlphaProfile: ChainTestProfile = {
  id: 'moonbase-alpha',
  displayName: 'Moonbase Alpha',
  chainId: 1287,
  defaultAnvilPort: 8583,
  buildForkRpcUrl() {
    return null
  },
}
