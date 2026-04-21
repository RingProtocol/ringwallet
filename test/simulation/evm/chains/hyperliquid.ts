import type { ChainTestProfile } from './types'

export const hyperliquidProfile: ChainTestProfile = {
  id: 'hyperliquid',
  displayName: 'Hyperliquid Testnet',
  chainId: 998,
  defaultAnvilPort: 8546,
  /** Fork not supported — Anvil runs as a fresh local chain with --chain-id 998. */
  buildForkRpcUrl() {
    return null
  },
}
