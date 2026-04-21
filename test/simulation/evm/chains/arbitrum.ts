import type { ChainTestProfile } from './types'

export const arbitrumProfile: ChainTestProfile = {
  id: 'arbitrum',
  displayName: 'Arbitrum One',
  chainId: 42161,
  defaultAnvilPort: 8549,
  /** Fork not supported — Anvil runs as a fresh local chain with --chain-id 42161. */
  buildForkRpcUrl() {
    return null
  },
}
