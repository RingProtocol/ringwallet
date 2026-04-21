import type { ChainTestProfile } from './types'

export const polygonProfile: ChainTestProfile = {
  id: 'polygon',
  displayName: 'Polygon',
  chainId: 137,
  defaultAnvilPort: 8550,
  /** Fork not supported — Anvil runs as a fresh local chain with --chain-id 137. */
  buildForkRpcUrl() {
    return null
  },
}
