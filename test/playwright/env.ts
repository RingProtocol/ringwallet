import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export interface EvmTestnetChainConfig {
  chainId: number
  chainName: string
  sendAmount: string
  /** Local Anvil port for this chain's fork */
  anvilPort: number
  /**
   * Exact URL(s) the app's EvmRpcService will call for this chain.
   * The fixture intercepts these via page.route and proxies them to local Anvil.
   * Must cover all entries returned by rpcUrl(chainId) in src/config/chains.ts.
   */
  rpcUrls: string[]
}

/**
 * Read VITE_ALCHEMY_RPC_KEY from process.env (set by CI or shell) or fall back
 * to reading the repo .env file directly — same approach as start-anvil.mjs.
 * next.config.mjs inlines VITE_* vars via DefinePlugin, so the browser app uses
 * the real key; we must register the exact same URL to intercept it.
 */
function loadAlchemyKey(): string {
  if (process.env.VITE_ALCHEMY_RPC_KEY?.trim())
    return process.env.VITE_ALCHEMY_RPC_KEY.trim()
  if (process.env.ALCHEMY_API_KEY?.trim())
    return process.env.ALCHEMY_API_KEY.trim()
  for (const file of ['.env.test', '.env']) {
    const p = resolve(process.cwd(), file)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const k = line.slice(0, eq).trim()
      if (k !== 'VITE_ALCHEMY_RPC_KEY' && k !== 'ALCHEMY_API_KEY') continue
      return line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
    }
  }
  return 'unknownalchemyapikey'
}

const alchemyKey = loadAlchemyKey()

/**
 * Solana RPC URLs the PWA may call (Alchemy + public fallback). Used by
 * setupSolanaRoutes to proxy to a local solana-test-validator when SOLANA_E2E_LOCAL=1.
 */
export const SOLANA_DEVNET_RPC_URLS: string[] = [
  `https://solana-devnet.g.alchemy.com/v2/${alchemyKey}`,
  'https://api.devnet.solana.com',
]

export const E2E_CONFIG_EVM = {
  baseUrl: 'http://localhost:3000',
  masterSeed:
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  address0: '0x9fe8b07AC19eAe1f3548D8379A534070A89Ee620',
}

export const EVM_TESTNET_CHAINS: EvmTestnetChainConfig[] = [
  // { chainId: 43113, chainName: 'Fuji', sendAmount: '0.001' },
  // { chainId: 195, chainName: 'X Layer', sendAmount: '0.001' },
  // { chainId: 9746, chainName: 'Plasma', sendAmount: '0.001' },
  // { chainId: 6342, chainName: 'MegaETH', sendAmount: '0.0001' },
  // { chainId: 568, chainName: 'Dogechain Testnet', sendAmount: '0.001' },
  {
    chainId: 998,
    chainName: 'Hyperliquid',
    sendAmount: '0.001',
    /** Keep 8546 free for Sepolia (8545) — matches `test/evmchain` Sepolia default + `yarn test:prepare` */
    anvilPort: 8546,
    // Chain 998 has no Alchemy endpoint; app uses only the public RPC (RPC_FALLBACK['998']).
    rpcUrls: ['https://api.hyperliquid-testnet.xyz/evm'],
  },
  {
    chainId: 11155111,
    chainName: 'Sepolia',
    sendAmount: '0.0001',
    /** Same default as `test/evmchain/chains/sepolia.ts` so `yarn test:prepare` + `yarn test:chain` work together */
    anvilPort: 8545,
    // next.config.mjs inlines VITE_ALCHEMY_RPC_KEY via DefinePlugin, so the app calls
    // the exact URL below. We register the same URL so Playwright intercepts it.
    rpcUrls: [
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
      'https://rpc.sepolia.org',
    ],
  },
]
