/**
 * Describes one EVM network for fork-based integration tests.
 * Add a new file under chains/ and register it in index.ts.
 */
export interface ChainTestProfile {
  /** CLI / env key, e.g. sepolia */
  id: string
  /** Human label */
  displayName: string
  /** Expected eth_chainId when forked correctly */
  chainId: number
  /** Default local Anvil HTTP port */
  defaultAnvilPort: number
  /**
   * Alchemy-style HTTPS RPC used only to build `anvil --fork-url`.
   * Uses ALCHEMY_API_KEY or VITE_ALCHEMY_RPC_KEY from .env.test
   */
  buildForkRpcUrl(): string
}
