import { ChainFamily, type Chain } from '../../models/ChainType'
import type { TokenInfo } from '../../utils/tokenStorage'
import type { DisplayToken } from './balanceTypes'
import { balanceAdapterRegistry } from './balanceAdapterRegistry'
import './adapters'

const PORTFOLIO_BALANCES_QUERY = `
query PortfolioBalances($ownerAddress: String!, $valueModifiers: [PortfolioValueModifier!], $chains: [Chain!]!) {
  portfolios(ownerAddresses: [$ownerAddress], chains: $chains, valueModifiers: $valueModifiers) {
    tokensTotalDenominatedValue { value }
    tokenBalances {
      denominatedValue { value }
      token { chain }
    }
  }
}
`

/** GraphQL `Chain` enum → Ring wallet EVM `chain.id` (see `src/config/chains.ts` & `/chainid.json`). */
const GRAPHQL_CHAIN_TO_WALLET_CHAIN_ID: Record<string, number> = {
  ARBITRUM: 42161,
  AVALANCHE: 43114,
  ETHEREUM: 1,
  ETHEREUM_SEPOLIA: 11155111,
  OPTIMISM: 10,
  POLYGON: 137,
  CELO: 42220,
  BNB: 56,
  BASE: 8453,
  BLAST: 81457,
  ZORA: 7777777,
  ZKSYNC: 324,
  UNICHAIN: 130,
  SONEIUM: 1868,
  WORLDCHAIN: 480,
  MONAD_TESTNET: 10143,
  ARBITRUM_SEPOLIA: 421614,
  BASE_SEPOLIA: 84532,
  HYPER: 999,
  XLAYER: 196,
}

const PORTFOLIO_GRAPHQL_CHAINS: readonly string[] = [
  'ARBITRUM',
  'AVALANCHE',
  'ETHEREUM',
  'ETHEREUM_SEPOLIA',
  'OPTIMISM',
  'POLYGON',
  'CELO',
  'BNB',
  'BASE',
  'BLAST',
  'ZORA',
  'ZKSYNC',
  'UNICHAIN',
  'SONEIUM',
  'WORLDCHAIN',
  'MONAD_TESTNET',
  'ARBITRUM_SEPOLIA',
  'BASE_SEPOLIA',
  'HYPER',
  'XLAYER',
  'ASTROCHAIN_SEPOLIA',
]

function portfolioGraphqlUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>
  return (
    env.VITE_PORTFOLIO_GRAPHQL_URL?.trim() || 'https://rw.testring.org/graphql'
  )
}

interface PortfolioBalancesResponse {
  data?: {
    portfolios?: Array<{
      tokensTotalDenominatedValue?: { value?: number }
      tokenBalances?: Array<{
        denominatedValue?: { value?: number } | null
        token?: { chain?: string } | null
      }>
    }>
  }
  errors?: Array<{ message: string }>
}

export interface FetchBalancesResult {
  nativeBalance: string
  tokens: DisplayToken[]
}

export function emptyBalance(family: ChainFamily | undefined): string {
  if (family === ChainFamily.Bitcoin || family === ChainFamily.Dogecoin) {
    return '0.00000000'
  }
  return '0.0000'
}

export async function fetchAllBalances(
  address: string,
  chain: Chain,
  importedTokens: TokenInfo[]
): Promise<FetchBalancesResult> {
  const family = chain.family ?? ChainFamily.EVM
  const adapter = balanceAdapterRegistry.get(family)

  if (!adapter) {
    const zero = emptyBalance(family)
    return {
      nativeBalance: zero,
      tokens: [
        {
          symbol: chain.symbol || 'UNKNOWN',
          name: chain.name,
          balance: zero,
          isNative: true,
        },
      ],
    }
  }

  const nativeBalance = await adapter.fetchNativeBalance(address, chain)

  const nativeToken: DisplayToken = {
    symbol: chain.symbol || 'UNKNOWN',
    name: chain.name,
    balance: nativeBalance,
    isNative: true,
  }

  let importedDisplayTokens: DisplayToken[] = []
  if (adapter.supportsTokens && importedTokens.length > 0) {
    const results = await adapter.fetchTokenBalances(
      address,
      chain,
      importedTokens
    )
    importedDisplayTokens = results.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      balance: t.balance,
      isNative: false,
      address: t.address,
      decimals: t.decimals,
    }))
  }

  return {
    nativeBalance,
    tokens: [nativeToken, ...importedDisplayTokens],
  }
}

/** Cached USD portfolio slice per wallet `chain.id` (numeric EVM id as string) plus `unallocated` when needed. */
const accountBalances = new Map<string, string>()

export function formatUsdAmount(totalNumericString: string): string {
  const n = Number(totalNumericString)
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(0)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n)
}

/** Fetches multi-chain portfolio USD from Ring GraphQL (see `api.md`), updates `accountBalances`, returns formatted total. */
export async function fetchAccountBalances(
  accountAddress: string,
  chain: Chain
): Promise<string> {
  accountBalances.clear()
  const chainKey = String(chain.id)
  const family = chain.family ?? ChainFamily.EVM
  const isEvm = family === ChainFamily.EVM
  const isHex = /^0x[a-fA-F0-9]{40}$/i.test(accountAddress)

  if (!isEvm || !isHex) {
    accountBalances.set(chainKey, '0')
    return formatUsdAmount(getAccountBalance())
  }

  try {
    const body = {
      operationName: 'PortfolioBalances',
      query: PORTFOLIO_BALANCES_QUERY,
      variables: {
        ownerAddress: accountAddress,
        chains: [...PORTFOLIO_GRAPHQL_CHAINS],
        valueModifiers: [
          {
            ownerAddress: accountAddress,
            tokenIncludeOverrides: [],
            tokenExcludeOverrides: [],
            includeSmallBalances: false,
            includeSpamTokens: false,
          },
        ],
      },
    }

    const res = await fetch(portfolioGraphqlUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Portfolio request failed: ${res.status}`)
    }

    const json = (await res.json()) as PortfolioBalancesResponse
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message ?? 'Portfolio GraphQL error')
    }

    const portfolio = json.data?.portfolios?.[0]
    const apiTotal = portfolio?.tokensTotalDenominatedValue?.value ?? 0

    const sums = new Map<number, number>()
    for (const tb of portfolio?.tokenBalances ?? []) {
      const v = tb.denominatedValue?.value
      if (v == null || !Number.isFinite(v)) continue
      const gq = tb.token?.chain
      if (!gq) continue
      const wid = GRAPHQL_CHAIN_TO_WALLET_CHAIN_ID[gq]
      if (wid == null) continue
      sums.set(wid, (sums.get(wid) ?? 0) + v)
    }

    const trackedIds = new Set(Object.values(GRAPHQL_CHAIN_TO_WALLET_CHAIN_ID))
    for (const wid of trackedIds) {
      accountBalances.set(String(wid), (sums.get(wid) ?? 0).toFixed(2))
    }

    const summedParts = [...accountBalances.values()].reduce(
      (acc, s) => acc + (Number(s) || 0),
      0
    )
    const residual = apiTotal - summedParts
    if (Math.abs(residual) > 0.01) {
      accountBalances.set('unallocated', residual.toFixed(2))
    }

    return formatUsdAmount(getAccountBalance())
  } catch (e) {
    console.error('fetchAccountBalances failed:', e)
    accountBalances.clear()
    accountBalances.set(chainKey, '0')
    return formatUsdAmount(getAccountBalance())
  }
}

/** Sums cached USD values (see `fetchAccountBalances`). */
export function getAccountBalance(): string {
  let total = 0
  for (const v of accountBalances.values()) {
    total += Number(v) || 0
  }
  return total.toFixed(2)
}
