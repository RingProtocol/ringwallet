import { ChainFamily, type Chain } from '../models/ChainType'

// ─── Per-chain env overrides (VITE_* injected at build time) ───

interface ChainEnvConfig {
  rpc?: string
  bundlerUrl?: string
  entryPoint?: string
  factoryAddress?: string
}

function env(key: string): string | undefined {
  const val = (import.meta.env as Record<string, string | undefined>)[key]
  return val?.trim() || undefined
}

const ENV: Record<string, ChainEnvConfig> = {
  '1': {
    rpc: env('VITE_RPC_ETH_MAINNET'),
    bundlerUrl: env('VITE_BUNDLER_ETH_MAINNET'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_ETH_MAINNET'),
  },
  '11155111': {
    rpc: env('VITE_RPC_SEPOLIA'),
    bundlerUrl: env('VITE_BUNDLER_SEPOLIA'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_SEPOLIA'),
  },
  '10': {
    rpc: env('VITE_RPC_OPTIMISM'),
    bundlerUrl: env('VITE_BUNDLER_OPTIMISM'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_OPTIMISM'),
  },
  '42161': {
    rpc: env('VITE_RPC_ARBITRUM'),
    bundlerUrl: env('VITE_BUNDLER_ARBITRUM'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_ARBITRUM'),
  },
  '137': {
    rpc: env('VITE_RPC_POLYGON'),
    bundlerUrl: env('VITE_BUNDLER_POLYGON'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_POLYGON'),
  },
  'solana-mainnet': {
    rpc: env('VITE_SOLANA_MAINNET_RPC'),
  },
  'solana-devnet': {
    rpc: env('VITE_SOLANA_DEVNET_RPC'),
  },
  // May be Esplora base URL or Alchemy `https://bitcoin-mainnet.g.alchemy.com/v2/<key>` — UTXO reads still use Esplora fallback in BitcoinService.
  'bitcoin-mainnet': {
    rpc: env('VITE_BITCOIN_API'),
  },
  /** Testnet4 only — do not fall back to `VITE_BITCOIN_TESTNET_API` (that is typically testnet3 / Alchemy `bitcoin-testnet`). */
  'bitcoin-testnet': {
    rpc: env('VITE_BITCOIN_TESTNET4_API'),
  },
  /** Legacy testnet3; `VITE_BITCOIN_TESTNET_API` is wired here for typical Alchemy `bitcoin-testnet` URLs. */
  'bitcoin-testnet3': {
    rpc: env('VITE_BITCOIN_TESTNET3_API') || env('VITE_BITCOIN_TESTNET_API'),
  },
  'tron-mainnet': {
    rpc: env('VITE_TRON_MAINNET_RPC'),
  },
  'tron-shasta': {
    rpc: env('VITE_TRON_SHASTA_RPC'),
  },
  'cosmos-hub': {
    rpc: env('VITE_COSMOS_HUB_RPC'),
  },
  'provenance-mainnet': {
    rpc: env('VITE_PROVENANCE_RPC'),
  },
}

// ─── Fallback RPCs (free / public endpoints) ───

const RPC_FALLBACK: Record<string, string> = {
  '1':        'https://eth.llamarpc.com',
  '11155111': 'https://rpc.sepolia.org',
  '10':       'https://mainnet.optimism.io',
  '42161':    'https://arb1.arbitrum.io/rpc',
  '137':      'https://polygon-rpc.com',
  'solana-mainnet': 'https://api.mainnet-beta.solana.com',
  'solana-devnet':  'https://api.devnet.solana.com',
  'bitcoin-mainnet': 'https://blockstream.info/api',
  'bitcoin-testnet': 'https://mempool.space/testnet4/api',
  'bitcoin-testnet3': 'https://blockstream.info/testnet/api',
  'tron-mainnet':    'https://api.trongrid.io/jsonrpc',
  'tron-shasta':     'https://api.shasta.trongrid.io/jsonrpc',
  'cosmos-hub':      'https://cosmos-rpc.publicnode.com',
  'provenance-mainnet': 'https://api.provenance.io',
}

function rpcUrl(chainId: string | number): string[] {
  const key = String(chainId)
  return [ENV[key]?.rpc, RPC_FALLBACK[key]].filter((url): url is string => Boolean(url))
}

// ─── Chain definitions ───

// Ordered list of ~20 major mainnet chains shown by default in ChainSwitcher.
// BTC + SOL first, then Ethereum, then popular L2s and L1s.
export const FEATURED_CHAIN_IDS: (number | string)[] = [
  'bitcoin-mainnet',
  'solana-mainnet',
  'tron-mainnet',
  'cosmos-hub',
  'provenance-mainnet',
  1,        // Ethereum
  10,       // Optimism
  42161,    // Arbitrum One
  8453,     // Base
  137,      // Polygon
  324,      // zkSync Era
  59144,    // Linea
  534352,   // Scroll
  56,       // BNB Smart Chain
  43114,    // Avalanche C-Chain
  250,      // Fantom
  42220,    // Celo
  100,      // Gnosis
  1284,     // Moonbeam
  5000,     // Mantle
  1101,     // Polygon zkEVM
  81457,    // Blast
  7777777,  // Zora
]

export const FEATURED_TESTNET_IDS: (number | string)[] = [
  'bitcoin-testnet',
  'bitcoin-testnet3',
  'solana-devnet',
  'tron-shasta',
  11155111, // Sepolia
]

export const DEFAULT_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(1),
    explorer: 'https://etherscan.io',
    bundlerUrl: ENV['1']?.bundlerUrl,
    entryPoint: ENV['1']?.entryPoint,
    factoryAddress: ENV['1']?.factoryAddress,
  },
  {
    id: 11155111,
    name: 'Sepolia Testnet',
    symbol: 'SepoliaETH',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(11155111),
    explorer: 'https://sepolia.etherscan.io',
    bundlerUrl: ENV['11155111']?.bundlerUrl,
    entryPoint: ENV['11155111']?.entryPoint,
    factoryAddress: ENV['11155111']?.factoryAddress,
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(10),
    explorer: 'https://optimistic.etherscan.io',
    bundlerUrl: ENV['10']?.bundlerUrl,
    entryPoint: ENV['10']?.entryPoint,
    factoryAddress: ENV['10']?.factoryAddress,
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(42161),
    explorer: 'https://arbiscan.io',
    bundlerUrl: ENV['42161']?.bundlerUrl,
    entryPoint: ENV['42161']?.entryPoint,
    factoryAddress: ENV['42161']?.factoryAddress,
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'POL',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(137),
    explorer: 'https://polygonscan.com',
    bundlerUrl: ENV['137']?.bundlerUrl,
    entryPoint: ENV['137']?.entryPoint,
    factoryAddress: ENV['137']?.factoryAddress,
  },
  {
    id: 'solana-mainnet',
    name: 'Solana',
    symbol: 'SOL',
    family: ChainFamily.Solana,
    cluster: 'mainnet-beta',
    rpcUrl: rpcUrl('solana-mainnet'),
    explorer: 'https://solscan.io',
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    symbol: 'SOL',
    family: ChainFamily.Solana,
    cluster: 'devnet',
    rpcUrl: rpcUrl('solana-devnet'),
    explorer: 'https://solscan.io/?cluster=devnet',
  },
  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin',
    symbol: 'BTC',
    family: ChainFamily.Bitcoin,
    rpcUrl: rpcUrl('bitcoin-mainnet'),
    explorer: 'https://mempool.space',
    network: 'mainnet',
    bitcoinFork: 'mainnet',
  },
  {
    id: 'bitcoin-testnet',
    name: 'Bitcoin Testnet4',
    symbol: 'tBTC',
    family: ChainFamily.Bitcoin,
    rpcUrl: rpcUrl('bitcoin-testnet'),
    explorer: 'https://mempool.space/testnet4',
    network: 'testnet',
    bitcoinFork: 'testnet4',
  },
  {
    id: 'bitcoin-testnet3',
    name: 'Bitcoin Testnet3',
    symbol: 'tBTC',
    family: ChainFamily.Bitcoin,
    rpcUrl: rpcUrl('bitcoin-testnet3'),
    explorer: 'https://mempool.space/testnet',
    network: 'testnet',
    bitcoinFork: 'testnet3',
  },
  // ─── Tron ───
  {
    id: 'tron-mainnet',
    name: 'Tron',
    symbol: 'TRX',
    family: ChainFamily.Tron,
    rpcUrl: rpcUrl('tron-mainnet'),
    explorer: 'https://tronscan.org',
  },
  {
    id: 'tron-shasta',
    name: 'Tron Shasta Testnet',
    symbol: 'TRX',
    family: ChainFamily.Tron,
    rpcUrl: rpcUrl('tron-shasta'),
    explorer: 'https://shasta.tronscan.org',
  },
  // ─── Cosmos ───
  {
    id: 'cosmos-hub',
    name: 'Cosmos Hub',
    symbol: 'ATOM',
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('cosmos-hub'),
    explorer: 'https://www.mintscan.io/cosmos',
    coinType: 118,
    addressPrefix: 'cosmos',
  },
  {
    id: 'provenance-mainnet',
    name: 'Provenance',
    symbol: 'HASH',
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('provenance-mainnet'),
    explorer: 'https://explorer.provenance.io',
    coinType: 505,
    addressPrefix: 'pb',
  },
]
