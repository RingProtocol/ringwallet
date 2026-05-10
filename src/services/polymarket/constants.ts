// Polymarket configuration — Polygon mainnet only
// References:
//   CTFExchange V1: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
//   ConditionalTokens: 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
//   USDC.e (V1 collateral): 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
//   Subgraph endpoints: Goldsky-hosted

export const POLYMARKET_CHAIN_ID = 137

export const POLYMARKET_CONTRACTS = {
  ctfExchangeV1: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  ctfExchangeV2: '0xE111180000d2663C0091e4f400237545B87B996B',
  negRiskExchangeV1: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  negRiskExchangeV2: '0xe2222d279d744050d28e00520010520000310F59',
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e (bridged)
  usdcNative: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  pUsdV2: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
} as const

export const POLYMARKET_SUBGRAPHS = {
  orderbook:
    'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn',
  positions:
    'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn',
  activity:
    'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn',
  openInterest:
    'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/oi-subgraph/0.0.6/gn',
  pnl: 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn',
} as const

export const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'
export const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com'

// EIP-712 domain for V1 orders
export const CTF_EXCHANGE_V1_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: POLYMARKET_CHAIN_ID,
  verifyingContract: POLYMARKET_CONTRACTS.ctfExchangeV1,
} as const

export const CTF_ORDER_TYPES_V1 = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
}

// Rounding config for order amounts (from official SDK)
export const TICK_SIZE_ROUNDING: Record<
  string,
  { price: number; size: number; amount: number }
> = {
  '0.1': { price: 1, size: 2, amount: 3 },
  '0.01': { price: 2, size: 2, amount: 4 },
  '0.001': { price: 3, size: 2, amount: 5 },
  '0.0001': { price: 4, size: 2, amount: 6 },
}

// All Polymarket amounts use 6 decimals
export const POLYMARKET_DECIMALS = 6
