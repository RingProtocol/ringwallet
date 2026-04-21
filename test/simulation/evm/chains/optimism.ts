import type { ChainTestProfile } from './types'

export const optimismProfile: ChainTestProfile = {
  id: 'optimism',
  displayName: 'Optimism',
  chainId: 10,
  defaultAnvilPort: 8548,
  /** Fork not supported — Anvil runs as a fresh local chain with --chain-id 10. */
  buildForkRpcUrl() {
    return null
  },
}
