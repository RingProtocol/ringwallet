import type { ChainTestProfile } from './types'

export const gnosisProfile: ChainTestProfile = {
  id: 'gnosis',
  displayName: 'Gnosis',
  chainId: 100,
  defaultAnvilPort: 8572,
  buildForkRpcUrl() {
    return null
  },
}

export const gnosisChiadoProfile: ChainTestProfile = {
  id: 'gnosis-chiado',
  displayName: 'Gnosis Chiado',
  chainId: 10200,
  defaultAnvilPort: 8573,
  buildForkRpcUrl() {
    return null
  },
}
