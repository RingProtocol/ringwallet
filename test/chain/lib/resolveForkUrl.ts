import { ensureTestEnv, getAlchemyApiKey } from './env'

/**
 * Sepolia URL for `anvil --fork-url`.
 * **Alchemy first** when `ALCHEMY_API_KEY` or `VITE_ALCHEMY_RPC_KEY` is set (adjust allowlist if anvil gets 403).
 * Otherwise falls back to `TESTCHAIN_FORK_URL_SEPOLIA` / `TESTCHAIN_FORK_URL`.
 */
export function resolveSepoliaForkRpcUrl(): string {
  ensureTestEnv()
  const key =
    process.env.ALCHEMY_API_KEY?.trim() ||
    process.env.VITE_ALCHEMY_RPC_KEY?.trim()
  if (key) {
    return `https://eth-sepolia.g.alchemy.com/v2/${key}`
  }
  const fromSepolia = process.env.TESTCHAIN_FORK_URL_SEPOLIA?.trim()
  if (fromSepolia) return fromSepolia
  const fallback = process.env.TESTCHAIN_FORK_URL?.trim()
  if (fallback) return fallback
  return `https://eth-sepolia.g.alchemy.com/v2/${getAlchemyApiKey()}`
}
