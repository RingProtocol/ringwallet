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
}

function rpcUrl(chainId: string | number): string {
  const key = String(chainId)
  return ENV[key]?.rpc || RPC_FALLBACK[key] || ''
}

// ─── Chain definitions ───

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
]
