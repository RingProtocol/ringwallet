/**
 * Subset of `src/features/balance/api2.md` “# response” (lines ~22–133) — same shape as
 * `POST https://rw.testring.org/v1/account_assets` JSON. `address` is filled per wallet.
 */
export { ACCOUNT_ASSETS_URL } from '@/server/urls'

/** Token rows from api2.md without `address` (injected per test wallet). */
export const API2_MOCK_TOKENS_TEMPLATE = [
  {
    network: 'eth-mainnet',
    tokenAddress: null,
    tokenBalance:
      '0x000000000000000000000000000000000000000000000000010a741f22666d40',
    tokenMetadata: {
      symbol: null,
      decimals: null,
      name: null,
      logo: null,
    },
    tokenPrices: [
      {
        currency: 'usd',
        value: '2385.0259039831',
        lastUpdatedAt: '2026-04-14T10:15:39Z',
      },
    ],
  },
  {
    network: 'eth-sepolia',
    tokenAddress: null,
    tokenBalance:
      '0x0000000000000000000000000000000000000000000000019510ff9a57d473bc',
    tokenMetadata: {
      symbol: null,
      decimals: null,
      name: null,
      logo: null,
    },
    tokenPrices: [],
  },
  {
    network: 'base-mainnet',
    tokenAddress: null,
    tokenBalance:
      '0x000000000000000000000000000000000000000000000000001132b6ac7395d7',
    tokenMetadata: {
      symbol: null,
      decimals: null,
      name: null,
      logo: null,
    },
    tokenPrices: [
      {
        currency: 'usd',
        value: '2385.0259039831',
        lastUpdatedAt: '2026-04-14T10:15:39Z',
      },
    ],
  },
  {
    network: 'bnb-mainnet',
    tokenAddress: null,
    tokenBalance:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    tokenMetadata: {
      symbol: null,
      decimals: null,
      name: null,
      logo: null,
    },
    tokenPrices: [
      {
        currency: 'usd',
        value: '618.753019912',
        lastUpdatedAt: '2026-04-14T10:15:43Z',
      },
    ],
  },
  {
    network: 'eth-mainnet',
    tokenAddress: '0x00e2b6d170740c15bf9fb01d0b6e77c0d4510e32',
    tokenBalance:
      '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
    tokenMetadata: {
      decimals: 18,
      logo: null,
      name: 'Royal Dog',
      symbol: 'DOG',
    },
    tokenPrices: [],
  },
  {
    network: 'eth-mainnet',
    tokenAddress: '0x059b2051bc369a52dfa4bcbaa77388483279320c',
    tokenBalance:
      '0x0000000000000000000000000000000000000000000000004563918244f40000',
    tokenMetadata: {
      decimals: 18,
      logo: null,
      name: 'UniLife',
      symbol: 'UniLife',
    },
    tokenPrices: [],
  },
  {
    network: 'eth-sepolia',
    tokenAddress: '0x059cf7a18a204dd707a26b3b7b018a50c9ad0ee3',
    tokenBalance:
      '0x0000000000000000000000000000000000000000000000033984867256dda709b7f1eb',
    tokenMetadata: {
      decimals: 18,
      logo: null,
      name: 'eth_v4',
      symbol: 'ETH_V4',
    },
    tokenPrices: [],
  },
] as const

export function buildAccountAssetsApi2MockBody(walletAddress: string): string {
  const addr = walletAddress.toLowerCase()
  const tokens = API2_MOCK_TOKENS_TEMPLATE.map((t) => ({
    ...t,
    address: addr,
  }))
  return JSON.stringify({ data: { tokens } })
}
