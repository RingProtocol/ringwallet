import { ChainFamily, type Chain } from '../models/ChainType'

// ─── Per-chain env overrides (VITE_* injected at build time) ───

interface ChainEnvConfig {
  rpc?: string | string[]
  bundlerUrl?: string
  entryPoint?: string
  factoryAddress?: string
}

function env(key: string): string {
  const envObj = (import.meta as unknown as Record<string, unknown>).env as
    | Record<string, string | undefined>
    | undefined
  const val = envObj?.[key]
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
    rpc: `https://solana-mainnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
  },
  'solana-devnet': {
    rpc: `https://solana-devnet.g.alchemy.com/v2/${env('VITE_ALCHEMY_RPC_KEY')}`,
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
  // Cosmos / Provenance RPC endpoints are public nodes, not Alchemy-shaped.
  'cosmos-hub': {
    rpc: 'https://cosmos-rpc.publicnode.com',
  },
  'provenance-mainnet': {
    rpc: 'https://api.provenance.io',
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
  'dogecoin-mainnet': ['https://api.blockcypher.com/v1/doge/main'],
  'dogecoin-testnet': ['https://api.blockcypher.com/v1/doge/test3'],
  'cosmos-hub': ['https://cosmos-rpc.publicnode.com'],
  'cosmos-testnet': [
    'https://cosmos-testnet-rpc.polkachu.com',
    'https://cosmoshub-testnet.rpc.kjnodes.com',
  ],
  'provenance-mainnet': ['https://api.provenance.io'],
  'provenance-testnet': ['https://rpc.test.provenance.io'],
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
  '4326': ['https://mainnet.megaeth.com/rpc'],
  '6342': ['https://carrot.megaeth.com/rpc'],
  '2000': [
    'https://rpc.dogechain.dog',
    'https://rpc01-sg.dogechain.dog',
    'https://rpc.ankr.com/dogechain',
  ],
  '568': ['https://rpc-testnet.dogechain.dog', 'https://568.rpc.thirdweb.com'],
  '11155420': ['https://sepolia.optimism.io'],
  '421614': ['https://sepolia-rollup.arbitrum.io/rpc'],
  '84532': ['https://sepolia.base.org'],
  '80002': ['https://rpc-amoy.polygon.technology'],
  '300': ['https://sepolia.era.zksync.dev'],
  '59141': ['https://rpc.sepolia.linea.build'],
  '534351': ['https://sepolia-rpc.scroll.io'],
  '97': ['https://bsc-testnet-rpc.publicnode.com'],
  '44787': ['https://alfajores-forno.celo-testnet.org'],
  '10200': ['https://rpc.chiadochain.net'],
  '5003': ['https://rpc.sepolia.mantle.xyz'],
  '168587773': ['https://sepolia.blast.io'],
  '999999999': ['https://sepolia.rpc.zora.energy'],
  '4002': ['https://rpc.testnet.fantom.network'],
  '1287': ['https://rpc.api.moonbase.moonbeam.network'],
  '2442': ['https://rpc.cardona.zkevm-rpc.com'],
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

// ─── Chain & coin icons ───

/** Chain ID → icon path. Each chain gets its own recognizable logo. */
const CHAIN_ICON: Record<string | number, string> = {
  // ── EVM mainnets ──
  1: '/icons/chains/eth.svg',
  10: '/icons/chains/optimism.svg',
  42161: '/icons/chains/arbitrum.svg',
  8453: '/icons/chains/base.svg',
  137: '/icons/chains/polygon.svg',
  324: '/icons/chains/zksync.svg',
  59144: '/icons/chains/linea.svg',
  534352: '/icons/chains/scroll.svg',
  56: '/icons/chains/bnb.svg',
  43114: '/icons/chains/avax.svg',
  250: '/icons/chains/ftm.svg',
  42220: '/icons/chains/celo.svg',
  100: '/icons/chains/xdai.svg',
  1284: '/icons/chains/glmr.svg',
  5000: '/icons/chains/mnt.svg',
  1101: '/icons/chains/polygon.svg', // Polygon zkEVM
  81457: '/icons/chains/blast.svg',
  7777777: '/icons/chains/zora.svg',
  196: '/icons/chains/okb.svg',
  999: '/icons/chains/hype.svg',
  9745: '/icons/chains/xpl.svg',
  4326: '/icons/chains/eth.svg', // MegaETH (ETH native)
  6342: '/icons/chains/eth.svg', // MegaETH Testnet (ETH native)
  2000: '/icons/chains/doge.svg',
  // ── EVM testnets ──
  11155111: '/icons/chains/eth.svg', // Sepolia
  11155420: '/icons/chains/optimism.svg', // OP Sepolia
  421614: '/icons/chains/arbitrum.svg', // Arbitrum Sepolia
  84532: '/icons/chains/base.svg', // Base Sepolia
  80002: '/icons/chains/polygon.svg', // Polygon Amoy
  300: '/icons/chains/zksync.svg', // zkSync Sepolia
  59141: '/icons/chains/linea.svg', // Linea Sepolia
  534351: '/icons/chains/scroll.svg', // Scroll Sepolia
  97: '/icons/chains/bnb.svg', // BNB Testnet
  44787: '/icons/chains/celo.svg', // Celo Alfajores
  10200: '/icons/chains/xdai.svg', // Gnosis Chiado
  5003: '/icons/chains/mnt.svg', // Mantle Sepolia
  168587773: '/icons/chains/blast.svg', // Blast Sepolia
  999999999: '/icons/chains/zora.svg', // Zora Sepolia
  4002: '/icons/chains/ftm.svg', // Fantom Testnet
  1287: '/icons/chains/glmr.svg', // Moonbase Alpha
  2442: '/icons/chains/polygon.svg', // Polygon zkEVM Cardona
  43113: '/icons/chains/avax.svg', // Fuji
  195: '/icons/chains/okb.svg', // X Layer Testnet
  998: '/icons/chains/hype.svg', // Hyperliquid Testnet
  9746: '/icons/chains/xpl.svg', // Plasma Testnet
  568: '/icons/chains/doge.svg', // Dogechain Testnet
  // ── Non-EVM ──
  'bitcoin-mainnet': '/icons/chains/btc.svg',
  'bitcoin-testnet': '/icons/chains/btc.svg',
  'bitcoin-testnet3': '/icons/chains/btc.svg',
  'solana-mainnet': '/icons/chains/sol.svg',
  'solana-devnet': '/icons/chains/sol.svg',
  'tron-mainnet': '/icons/chains/trx.svg',
  'tron-shasta': '/icons/chains/trx.svg',
  'dogecoin-mainnet': '/icons/chains/doge.svg',
  'dogecoin-testnet': '/icons/chains/doge.svg',
  'cosmos-hub': '/icons/chains/atom.svg',
  'cosmos-testnet': '/icons/chains/atom.svg',
  'provenance-mainnet': '/icons/chains/hash.svg',
  'provenance-testnet': '/icons/chains/hash.svg',
}

/** Symbol → icon path fallback for dynamic chains loaded from chainid.json. */
export const NATIVE_COIN_ICON: Record<string, string> = {
  ETH: '/icons/chains/eth.svg',
  BTC: '/icons/chains/btc.svg',
  tBTC: '/icons/chains/btc.svg',
  SOL: '/icons/chains/sol.svg',
  TRX: '/icons/chains/trx.svg',
  ATOM: '/icons/chains/atom.svg',
  POL: '/icons/chains/pol.svg',
  MATIC: '/icons/chains/polygon.svg',
  AVAX: '/icons/chains/avax.svg',
  BNB: '/icons/chains/bnb.svg',
  FTM: '/icons/chains/ftm.svg',
  CELO: '/icons/chains/celo.svg',
  xDAI: '/icons/chains/xdai.svg',
  GNO: '/icons/chains/xdai.svg',
  GLMR: '/icons/chains/glmr.svg',
  MNT: '/icons/chains/mnt.svg',
  OKB: '/icons/chains/okb.svg',
  HYPE: '/icons/chains/hype.svg',
  XPL: '/icons/chains/xpl.svg',
  DOGE: '/icons/chains/doge.svg',
  HASH: '/icons/chains/hash.svg',
  SepoliaETH: '/icons/chains/eth.svg',
}

/** Resolve icon for a chain by ID, falling back to symbol-based lookup. */
/**
 * Cosmos chain variants with different coinType / addressPrefix.
 * The registry uses this to derive separate account sets per variant.
 */
export const COSMOS_CHAIN_VARIANTS: {
  key: string
  coinType: number
  addressPrefix: string
}[] = [
  { key: 'cosmos', coinType: 118, addressPrefix: 'cosmos' },
  { key: 'provenance', coinType: 505, addressPrefix: 'pb' },
]

export function resolveChainIcon(
  id: string | number,
  symbol?: string
): string | undefined {
  return CHAIN_ICON[id] ?? (symbol ? NATIVE_COIN_ICON[symbol] : undefined)
}

function chainIcon(id: string | number): string | undefined {
  return CHAIN_ICON[id]
}

// ─── Chain definitions ───

// Ordered list of ~20 major mainnet chains shown by default in ChainSwitcher.
// BTC + SOL first, then Ethereum, then popular L2s and L1s.
export const FEATURED_CHAIN_IDS: (number | string)[] = [
  'bitcoin-mainnet',
  'dogecoin-mainnet',
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
  1284, // Moonbeam, Polkadot 生态的 EVM 兼容主网，原生代币 GLMR
  5000, // Mantle
  1101, // Polygon zkEVM
  81457, // Blast
  7777777, // Zora
  196, // X Layer
  999, // Hyperliquid L1
  9745, // Plasma
  4326, // MegaETH
  // 2000, // Dogechain
]

export const FEATURED_TESTNET_IDS: (number | string)[] = [
  'bitcoin-testnet',
  'bitcoin-testnet3',
  'dogecoin-testnet',
  'solana-devnet',
  'tron-shasta',
  'cosmos-testnet',
  'provenance-testnet',
  11155111, // Sepolia
  11155420, // OP Sepolia
  421614, // Arbitrum Sepolia
  84532, // Base Sepolia
  80002, // Polygon Amoy
  300, // zkSync Sepolia
  59141, // Linea Sepolia
  534351, // Scroll Sepolia
  97, // BNB Testnet
  43113, // Avalanche Fuji
  44787, // Celo Alfajores
  10200, // Gnosis Chiado
  5003, // Mantle Sepolia
  168587773, // Blast Sepolia
  999999999, // Zora Sepolia
  4002, // Fantom Testnet
  1287, // Moonbase Alpha, Moonbeam 的测试网
  2442, // Polygon zkEVM Cardona
  195, // X Layer Testnet
  998, // Hyperliquid Testnet
  9746, // Plasma Testnet
  6342, // MegaETH Testnet
  // 568, // Dogechain Testnet
]

//chain info
export const DEFAULT_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    icon: chainIcon(1),
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
    icon: chainIcon(11155111),
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
    icon: chainIcon(10),
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
    icon: chainIcon(42161),
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
    icon: chainIcon(137),
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
    icon: chainIcon('solana-mainnet'),
    family: ChainFamily.Solana,
    cluster: 'mainnet-beta',
    rpcUrl: rpcUrl('solana-mainnet'),
    explorer: 'https://solscan.io',
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    symbol: 'SOL',
    icon: chainIcon('solana-devnet'),
    family: ChainFamily.Solana,
    cluster: 'devnet',
    rpcUrl: rpcUrl('solana-devnet'),
    explorer: 'https://solscan.io/?cluster=devnet',
  },
  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: chainIcon('bitcoin-mainnet'),
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
    icon: chainIcon('bitcoin-testnet'),
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
    icon: chainIcon('bitcoin-testnet3'),
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
    icon: chainIcon('tron-mainnet'),
    family: ChainFamily.Tron,
    rpcUrl: rpcUrl('tron-mainnet'),
    explorer: 'https://tronscan.org',
  },
  {
    id: 'tron-shasta',
    name: 'Tron Shasta Testnet',
    symbol: 'TRX',
    icon: chainIcon('tron-shasta'),
    family: ChainFamily.Tron,
    rpcUrl: rpcUrl('tron-shasta'),
    explorer: 'https://shasta.tronscan.org',
  },
  // ─── Cosmos ───
  {
    id: 'cosmos-hub',
    name: 'Cosmos Hub',
    symbol: 'ATOM',
    icon: chainIcon('cosmos-hub'),
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('cosmos-hub'),
    explorer: 'https://www.mintscan.io/cosmos',
    coinType: 118,
    addressPrefix: 'cosmos',
  },
  {
    id: 'cosmos-testnet',
    name: 'Cosmos Hub Testnet',
    symbol: 'ATOM',
    icon: chainIcon('cosmos-testnet'),
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('cosmos-testnet'),
    explorer: 'https://explorer.kjnodes.com/cosmoshub-testnet',
    coinType: 118,
    addressPrefix: 'cosmos',
  },
  {
    id: 'provenance-mainnet',
    name: 'Provenance',
    symbol: 'HASH',
    icon: chainIcon('provenance-mainnet'),
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('provenance-mainnet'),
    explorer: 'https://explorer.provenance.io',
    coinType: 505,
    addressPrefix: 'pb',
  },
  {
    id: 'provenance-testnet',
    name: 'Provenance Testnet',
    symbol: 'HASH',
    icon: chainIcon('provenance-testnet'),
    family: ChainFamily.Cosmos,
    rpcUrl: rpcUrl('provenance-testnet'),
    explorer: 'https://explorer.test.provenance.io',
    coinType: 1,
    addressPrefix: 'tp',
  },
  // ─── Avalanche ───
  {
    id: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    icon: chainIcon(43114),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(43114),
    explorer: 'https://snowscan.xyz',
  },
  {
    id: 43113,
    name: 'Avalanche Fuji Testnet',
    symbol: 'AVAX',
    icon: chainIcon(43113),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(43113),
    explorer: 'https://testnet.snowscan.xyz',
  },
  // ─── X Layer (OKX) ───
  {
    id: 196,
    name: 'X Layer',
    symbol: 'OKB',
    icon: chainIcon(196),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(196),
    explorer: 'https://www.oklink.com/xlayer',
  },
  {
    id: 195,
    name: 'X Layer Testnet',
    symbol: 'OKB',
    icon: chainIcon(195),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(195),
    explorer: 'https://www.oklink.com/xlayer-test',
  },
  // ─── Hyperliquid ───
  {
    id: 999,
    name: 'Hyperliquid L1',
    symbol: 'HYPE',
    icon: chainIcon(999),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(999),
    explorer: 'https://hypurrscan.io',
  },
  {
    id: 998,
    name: 'Hyperliquid Testnet',
    symbol: 'HYPE',
    icon: chainIcon(998),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(998),
    explorer: '',
  },
  // ─── Plasma ───
  {
    id: 9745,
    name: 'Plasma',
    symbol: 'XPL',
    icon: chainIcon(9745),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(9745),
    explorer: 'https://plasmascan.to',
  },
  {
    id: 9746,
    name: 'Plasma Testnet',
    symbol: 'XPL',
    icon: chainIcon(9746),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(9746),
    explorer: 'https://testnet.plasmascan.to',
  },
  // ─── MegaETH ───
  {
    id: 4326,
    name: 'MegaETH',
    symbol: 'ETH',
    icon: chainIcon(4326),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(4326),
    explorer: 'https://megaeth.blockscout.com',
  },
  {
    id: 6342,
    name: 'MegaETH Testnet',
    symbol: 'ETH',
    icon: chainIcon(6342),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(6342),
    explorer: '',
  },
  // ─── Dogecoin L1 ───
  {
    id: 'dogecoin-mainnet',
    name: 'Dogecoin',
    symbol: 'DOGE',
    icon: chainIcon('dogecoin-mainnet'),
    family: ChainFamily.Dogecoin,
    rpcUrl: rpcUrl('dogecoin-mainnet'),
    explorer: 'https://dogechain.info',
    network: 'mainnet',
  },
  {
    id: 'dogecoin-testnet',
    name: 'Dogecoin Testnet',
    symbol: 'tDOGE',
    icon: chainIcon('dogecoin-testnet'),
    family: ChainFamily.Dogecoin,
    rpcUrl: rpcUrl('dogecoin-testnet'),
    explorer: 'https://dogechain.info',
    network: 'testnet',
  },
  // ─── Dogechain ───
  {
    id: 2000,
    name: 'Dogechain',
    symbol: 'DOGE',
    icon: chainIcon(2000),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(2000),
    explorer: 'https://explorer.dogechain.dog',
  },
  {
    id: 568,
    name: 'Dogechain Testnet',
    symbol: 'DOGE',
    icon: chainIcon(568),
    family: ChainFamily.EVM,
    rpcUrl: rpcUrl(568),
    explorer: 'https://explorer-testnet.dogechain.dog',
  },
]

/** Wallet `chain.id` → `account_assets` network slug when it differs from RPC host. */
export const WALLET_CHAIN_ID_TO_ACCOUNT_ASSETS_NETWORK: Partial<
  Record<string, string>
> = {
  'bitcoin-testnet': 'bitcoin-testnet4',
  'bitcoin-testnet3': 'bitcoin-testnet',
  'tron-shasta': 'tron-testnet',
}

/** Maps `Chain` to Alchemy-style `account_assets` network slug (see scripts/chainname.md). */
export function chainToAccountAssetsNetwork(chain: Chain): string | undefined {
  const id = typeof chain.id === 'string' ? chain.id : String(chain.id)

  if (typeof chain.id === 'string' && !/^\d+$/.test(chain.id)) {
    if (
      chain.family === ChainFamily.Bitcoin ||
      chain.family === ChainFamily.Solana ||
      chain.family === ChainFamily.Tron ||
      chain.family === ChainFamily.Prisma
    ) {
      return WALLET_CHAIN_ID_TO_ACCOUNT_ASSETS_NETWORK[chain.id] ?? chain.id
    }
    return undefined
  }

  if (chain.family !== ChainFamily.EVM) return undefined
  if (/beacon/i.test(chain.name)) {
    switch (id) {
      case '1':
        return 'eth-mainnetbeacon'
      case '11155111':
        return 'eth-sepoliabeacon'
      case '17000':
        return 'eth-holeskybeacon'
      case '560048':
        return 'eth-hoodibeacon'
      default:
        break
    }
  }
  switch (id) {
    case '1':
      return 'eth-mainnet'
    case '3':
      return 'xmtp-ropsten'
    case '10':
      return 'opt-mainnet'
    case '30':
      return 'rootstock-mainnet'
    case '31':
      return 'rootstock-testnet'
    case '56':
      return 'bnb-mainnet'
    case '97':
      return 'bnb-testnet'
    case '100':
      return 'gnosis-mainnet'
    case '130':
      return 'unichain-mainnet'
    case '137':
      return 'polygon-mainnet'
    case '143':
      return 'monad-mainnet'
    case '146':
      return 'sonic-mainnet'
    case '204':
      return 'opbnb-mainnet'
    case '232':
      return 'lens-mainnet'
    case '238':
      return 'blast-mainnet'
    case '288':
      return 'boba-mainnet'
    case '300':
      return 'zksync-sepolia'
    case '324':
      return 'zksync-mainnet'
    case '360':
      return 'shape-mainnet'
    case '480':
      return 'worldchain-mainnet'
    case '486':
      return 'standard-mainnet'
    case '510':
      return 'synd-mainnet'
    case '545':
      return 'flow-testnet'
    case '592':
      return 'astar-mainnet'
    case '747':
      return 'flow-mainnet'
    case '869':
      return 'worldmobilechain-mainnet'
    case '919':
      return 'mode-sepolia'
    case '988':
      return 'stable-mainnet'
    case '998':
      return 'hyperliquid-testnet'
    case '999':
      return 'hyperliquid-mainnet'
    case '1088':
      return 'metis-mainnet'
    case '1101':
      return 'polygonzkevm-mainnet'
    case '1284':
      return 'moonbeam-mainnet'
    case '1301':
      return 'unichain-sepolia'
    case '1315':
      return 'story-aeneid'
    case '1328':
      return 'sei-testnet'
    case '1329':
      return 'sei-mainnet'
    case '1514':
      return 'story-mainnet'
    case '1868':
      return 'soneium-mainnet'
    case '1946':
      return 'soneium-minato'
    case '2020':
      return 'ronin-mainnet'
    case '2162':
      return 'anime-sepolia'
    case '2201':
      return 'stable-testnet'
    case '2442':
      return 'polygonzkevm-cardona'
    case '2522':
      return 'frax-mainnet'
    case '2523':
      return 'frax-hoodi'
    case '2741':
      return 'abstract-mainnet'
    case '3343':
      return 'edge-mainnet'
    case '3636':
      return 'botanix-testnet'
    case '3637':
      return 'botanix-mainnet'
    case '4114':
      return 'citrea-mainnet'
    case '4157':
      return 'crossfi-testnet'
    case '4158':
      return 'crossfi-mainnet'
    case '4326':
      return 'megaeth-mainnet'
    case '4801':
      return 'worldchain-sepolia'
    case '5000':
      return 'mantle-mainnet'
    case '5003':
      return 'mantle-sepolia'
    case '5115':
      return 'citrea-testnet'
    case '5330':
      return 'superseed-mainnet'
    case '5371':
      return 'settlus-mainnet'
    case '5373':
      return 'settlus-septestnet'
    case '5611':
      return 'opbnb-testnet'
    case '6342':
      return 'megaeth-testnet'
    case '6805':
      return 'race-mainnet'
    case '6806':
      return 'race-sepolia'
    case '7000':
      return 'zetachain-mainnet'
    case '7001':
      return 'zetachain-testnet'
    case '8008':
      return 'polynomial-mainnet'
    case '8386':
      return 'xprotocol-mainnet'
    case '8453':
      return 'base-mainnet'
    case '9745':
      return 'plasma-mainnet'
    case '9746':
      return 'plasma-testnet'
    case '10143':
      return 'monad-testnet'
    case '10200':
      return 'gnosis-chiado'
    case '10218':
      return 'tea-sepolia'
    case '11011':
      return 'shape-sepolia'
    case '11124':
      return 'abstract-testnet'
    case '14601':
      return 'sonic-testnet'
    case '17000':
      return 'eth-holesky'
    case '28882':
      return 'boba-sepolia'
    case '33111':
      return 'apechain-curtis'
    case '33139':
      return 'apechain-mainnet'
    case '33431':
      return 'edge-testnet'
    case '34443':
      return 'mode-mainnet'
    case '36900':
      return 'adi-mainnet'
    case '37111':
      return 'lens-sepolia'
    case '42161':
      return 'arb-mainnet'
    case '42170':
      return 'arbnova-mainnet'
    case '42220':
      return 'celo-mainnet'
    case '42431':
      return 'tempo-moderato'
    case '43113':
      return 'avax-fuji'
    case '43114':
      return 'avax-mainnet'
    case '53302':
      return 'superseed-sepolia'
    case '57054':
      return 'sonic-blaze'
    case '57073':
      return 'ink-mainnet'
    case '59141':
      return 'linea-sepolia'
    case '59144':
      return 'linea-mainnet'
    case '60808':
      return 'bob-mainnet'
    case '69000':
      return 'anime-mainnet'
    case '80002':
      return 'polygon-amoy'
    case '80008':
      return 'polynomial-sepolia'
    case '80069':
      return 'berachain-bepolia'
    case '80094':
      return 'berachain-mainnet'
    case '84532':
      return 'base-sepolia'
    case '88899':
      return 'unite-mainnet'
    case '202209':
      return 'alterscope-mainnet'
    case '202601':
      return 'ronin-saigon'
    case '323432':
      return 'worldmobile-testnet'
    case '421614':
      return 'arb-sepolia'
    case '534351':
      return 'scroll-sepolia'
    case '534352':
      return 'scroll-mainnet'
    case '560048':
      return 'eth-hoodi'
    case '613419':
      return 'galactica-mainnet'
    case '685685':
      return 'gensyn-testnet'
    case '685689':
      return 'gensyn-mainnet'
    case '763373':
      return 'ink-sepolia'
    case '808813':
      return 'bob-sepolia'
    case '843843':
      return 'galactica-cassiopeia'
    case '888991':
      return 'unite-testnet'
    case '5042002':
      return 'arc-testnet'
    case '6985385':
      return 'humanity-mainnet'
    case '7080969':
      return 'humanity-testnet'
    case '7777777':
      return 'zora-mainnet'
    case '11142220':
      return 'celo-sepolia'
    case '11155111':
      return 'eth-sepolia'
    case '11155420':
      return 'opt-sepolia'
    case '11155931':
      return 'rise-testnet'
    case '24132016':
      return 'xmtp-mainnet'
    case '168587773':
      return 'blast-sepolia'
    case '666666666':
      return 'degen-mainnet'
    case '728126428':
      return 'tron-mainnet'
    case '888888801':
      return 'solana-mainnet'
    case '888888802':
      return 'bitcoin-mainnet'
    case '888888812':
      return 'solana-devnet'
    case '888888813':
      return 'bitcoin-testnet'
    case '888888814':
      return 'bitcoin-signet'
    case '888888815':
      return 'commons-mainnet'
    case '888888816':
      return 'mythos-mainnet'
    case '888888817':
      return 'earnm-sepolia'
    case '888888818':
      return 'earnm-mainnet'
    case '888888819':
      return 'worldl3-devnet'
    case '888888820':
      return 'clankermon-mainnet'
    case '888888821':
      return 'risa-testnet'
    case '888888822':
      return 'tempo-mainnet'
    case '888888823':
      return 'celestiabridge-mainnet'
    case '888888824':
      return 'celestiabridge-mocha'
    case '888888825':
      return 'alchemyarb-fam'
    case '888888826':
      return 'alchemyarb-sepolia'
    case '888888827':
      return 'syndicate-manchego'
    case '888888828':
      return 'openloot-sepolia'
    case '888888829':
      return 'worldmobile-devnet'
    case '888888830':
      return 'degen-sepolia'
    case '888888831':
      return 'alchemy-sepolia'
    case '888888832':
      return 'alchemy-internal'
    case '888888833':
      return 'adi-testnet'
    case '888888901':
      return 'sui-mainnet'
    case '888888902':
      return 'sui-testnet'
    case '888888904':
      return 'aptos-mainnet'
    case '888888906':
      return 'starknet-mainnet'
    case '888888911':
      return 'aptos-testnet'
    case '999999999':
      return 'zora-sepolia'
    case '2494104990':
      return 'tron-testnet'
    case '920637907288165':
      return 'starknet-sepolia'
    default:
      return undefined
  }
}
