import { ChainFamily, type Chain } from '../models/ChainType'

// ─── Per-chain env overrides (VITE_* injected at build time) ───

interface ChainEnvConfig {
  rpc?: string | string[]
  bundlerUrl?: string
  entryPoint?: string
  factoryAddress?: string
}

function env(key: string): string {
  const val = (import.meta.env as Record<string, string | undefined>)[key]
  return val?.trim() || 'unknownalchemyapikey'
}

const ENV: Record<string, ChainEnvConfig> = {
  '1': {
    rpc: `https://eth-mainnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
    bundlerUrl: env('VITE_BUNDLER_ETH_MAINNET'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_ETH_MAINNET'),
  },
  '11155111': {
    rpc: `https://eth-sepolia.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
    bundlerUrl: env('VITE_BUNDLER_SEPOLIA'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_SEPOLIA'),
  },
  '10': {
    rpc: `https://optimism-mainnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
    bundlerUrl: env('VITE_BUNDLER_OPTIMISM'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_OPTIMISM'),
  },
  '42161': {
    rpc: `https://arb1.arbitrum.io/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
    bundlerUrl: env('VITE_BUNDLER_ARBITRUM'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_ARBITRUM'),
  },
  '137': {
    rpc: `https://polygon-rpc.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
    bundlerUrl: env('VITE_BUNDLER_POLYGON'),
    entryPoint: env('VITE_ENTRYPOINT_4337'),
    factoryAddress: env('VITE_FACTORY_POLYGON'),
  },
  'solana-mainnet': {
    rpc: `https://api.mainnet-beta.solana.com/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'solana-devnet': {
    rpc: `https://api.devnet.solana.com/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  // May be Esplora base URL or Alchemy `https://bitcoin-mainnet.g.alchemy.com/v2/<key>` — UTXO reads still use Esplora fallback in BitcoinService.
  'bitcoin-mainnet': {
    rpc: `https://bitcoin-mainnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  /** Testnet4 only — do not fall back to `VITE_BITCOIN_TESTNET_API` (that is typically testnet3 / Alchemy `bitcoin-testnet`). */
  'bitcoin-testnet': {
    rpc: `https://bitcoin-testnet4.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  /** Legacy testnet3; `VITE_BITCOIN_TESTNET_API` is wired here for typical Alchemy `bitcoin-testnet` URLs. */
  'bitcoin-testnet3': {
    rpc: `https://bitcoin-testnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'tron-mainnet': {
    rpc: `https://api.trongrid.io/jsonrpc/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'tron-shasta': {
    rpc: `https://api.shasta.trongrid.io/jsonrpc/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'cosmos-hub': {
    rpc: `https://cosmos-rpc.publicnode.com/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'provenance-mainnet': {
    rpc: `https://api.provenance.io/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
}

// ─── Fallback RPCs (free / public endpoints) ───

type RpcConfigValue = string[]

const RPC_FALLBACK: Record<string, RpcConfigValue> = {
  '1': ['https://eth.llamarpc.com'],
  '11155111': ['https://rpc.sepolia.org'],
  '10': ['https://mainnet.optimism.io'],
  '42161': ['https://arb1.arbitrum.io/rpc'],
  '137': ['https://polygon-rpc.com'],
  'solana-mainnet': ['https://api.mainnet-beta.solana.com'],
  'solana-devnet': ['https://api.devnet.solana.com'],
  'bitcoin-mainnet': [
    'https://blockstream.info/api',
    'https://mempool.space/api',
  ],
  'bitcoin-testnet': ['https://mempool.space/testnet4/api'],
  'bitcoin-testnet3': ['https://blockstream.info/testnet/api'],
  'tron-mainnet': [
    'https://rpc.ankr.com/tron_jsonrpc',
    'https://api.trongrid.io/jsonrpc',
  ],
  'tron-shasta': ['https://api.shasta.trongrid.io/jsonrpc'],
  'cosmos-hub': ['https://cosmos-rpc.publicnode.com'],
  'provenance-mainnet': ['https://api.provenance.io'],
  '43114': [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain-rpc.publicnode.com',
  ],
  '43113': [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://avalanche-fuji-c-chain-rpc.publicnode.com',
  ],
  '196': ['https://rpc.xlayer.tech', 'https://xlayerrpc.okx.com'],
  '195': ['https://testrpc.xlayer.tech', 'https://xlayertestrpc.okx.com'],
  '999': ['https://rpc.hyperliquid.xyz/evm'],
  '998': ['https://api.hyperliquid-testnet.xyz/evm'],
  '9745': ['https://rpc.plasma.to'],
  '9746': ['https://testnet-rpc.plasma.to'],
  '6342': ['https://carrot.megaeth.com/rpc'],
  '2000': [
    'https://rpc.dogechain.dog',
    'https://rpc01-sg.dogechain.dog',
    'https://rpc.ankr.com/dogechain',
  ],
  '568': ['https://rpc-testnet.dogechain.dog'],
}

function flattenRpcValues(
  ...values: Array<string | string[] | undefined>
): string[] {
  return [
    ...new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => Boolean(value))
    ),
  ]
}

function rpcUrl(chainId: string | number): string[] {
  const key = String(chainId)
  return flattenRpcValues(ENV[key]?.rpc, RPC_FALLBACK[key])
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
  1, // Ethereum
  10, // Optimism
  42161, // Arbitrum One
  8453, // Base
  137, // Polygon
  324, // zkSync Era
  59144, // Linea
  534352, // Scroll
  56, // BNB Smart Chain
  43114, // Avalanche C-Chain
  250, // Fantom
  42220, // Celo
  100, // Gnosis
  1284, // Moonbeam
  5000, // Mantle
  1101, // Polygon zkEVM
  81457, // Blast
  7777777, // Zora
  196, // X Layer
  999, // Hyperliquid L1
  9745, // Plasma
  6342, // MegaETH Testnet
  2000, // Dogechain
]

export const FEATURED_TESTNET_IDS: (number | string)[] = [
  'bitcoin-testnet',
  'bitcoin-testnet3',
  'solana-devnet',
  'tron-shasta',
  11155111, // Sepolia
  43113, // Avalanche Fuji
  195, // X Layer Testnet
  998, // Hyperliquid Testnet
  9746, // Plasma Testnet
  568, // Dogechain Testnet
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
  // ─── Avalanche ───
  {
    id: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(43114),
    explorer: 'https://snowscan.xyz',
  },
  {
    id: 43113,
    name: 'Avalanche Fuji Testnet',
    symbol: 'AVAX',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(43113),
    explorer: 'https://testnet.snowscan.xyz',
  },
  // ─── X Layer (OKX) ───
  {
    id: 196,
    name: 'X Layer',
    symbol: 'OKB',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(196),
    explorer: 'https://www.oklink.com/xlayer',
  },
  {
    id: 195,
    name: 'X Layer Testnet',
    symbol: 'OKB',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(195),
    explorer: 'https://www.oklink.com/xlayer-test',
  },
  // ─── Hyperliquid ───
  {
    id: 999,
    name: 'Hyperliquid L1',
    symbol: 'HYPE',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(999),
    explorer: 'https://hypurrscan.io',
  },
  {
    id: 998,
    name: 'Hyperliquid Testnet',
    symbol: 'HYPE',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(998),
    explorer: '',
  },
  // ─── Plasma ───
  {
    id: 9745,
    name: 'Plasma',
    symbol: 'XPL',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(9745),
    explorer: 'https://plasmascan.to',
  },
  {
    id: 9746,
    name: 'Plasma Testnet',
    symbol: 'XPL',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(9746),
    explorer: 'https://testnet.plasmascan.to',
  },
  // ─── MegaETH ───
  {
    id: 6342,
    name: 'MegaETH Testnet',
    symbol: 'ETH',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(6342),
    explorer: '',
  },
  // ─── Dogechain ───
  {
    id: 2000,
    name: 'Dogechain',
    symbol: 'DOGE',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(2000),
    explorer: 'https://explorer.dogechain.dog',
  },
  {
    id: 568,
    name: 'Dogechain Testnet',
    symbol: 'DOGE',
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(568),
    explorer: '',
  },
]
