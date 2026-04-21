/**
 * Describes one EVM network for Anvil-based integration tests.
 * Add a new file under chains/ and register it in index.ts.
 */
export interface ChainTestProfile {
  /** CLI / env key, e.g. sepolia */
  id: string
  /** Human label */
  displayName: string
  /** Expected eth_chainId on the local Anvil instance */
  chainId: number
  /** Default local Anvil HTTP port */
  defaultAnvilPort: number
  /**
   * Returns the HTTPS RPC URL for `anvil --fork-url`, or null when the chain
   * runs as a fresh local chain (fork not supported, e.g. Hyperliquid).
   */
  buildForkRpcUrl(): string | null
}
