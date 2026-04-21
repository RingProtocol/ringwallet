import type { ChainTestProfile } from './types'

export const megaethTestnetProfile: ChainTestProfile = {
  id: 'megaeth-testnet',
  displayName: 'MegaETH Testnet',
  chainId: 6342,
  defaultAnvilPort: 8586,
  buildForkRpcUrl() {
    return null
  },
}
