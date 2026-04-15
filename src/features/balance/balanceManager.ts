import { formatUnits } from 'ethers'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import { ChainFamily, type Chain } from '../../models/ChainType'
import {
  cacheTokensForNetwork,
  type ChainToken,
  notifyTokenCacheUpdated,
} from '../../models/ChainTokens'
// import type { TokenInfo } from '../../utils/tokenStorage'
import type { DisplayToken } from './balanceTypes'

/** Default interval for refreshing account_assets; override with `setAccountBalancePollIntervalMs`. */
export const ACCOUNT_BALANCE_POLL_INTERVAL_MS = 10_000

let accountBalancePollIntervalMs = ACCOUNT_BALANCE_POLL_INTERVAL_MS

export function getAccountBalancePollIntervalMs(): number {
  return accountBalancePollIntervalMs
}

export function setAccountBalancePollIntervalMs(ms: number): void {
  accountBalancePollIntervalMs = Math.max(5_000, ms)
}

const ACCOUNT_ASSETS_URL = 'https://rw.testring.org/v1/account_assets'

type AccountAssetsRequest = {
  addresses: Array<{
    address: string
    networks: string[]
  }>
}

type AccountAssetsResponse = {
  data: {
    tokens: ChainToken[]
    pageKey?: string
  }
}

function formatTokenQuantity(
  balanceHex: string,
  decimals: number,
  displayDecimals: number
): string {
  try {
    const raw = BigInt(balanceHex)
    const qty = formatUnits(raw, decimals)
    const num = Number(qty)
    if (!Number.isFinite(num)) return '0'
    return num.toFixed(displayDecimals)
  } catch {
    return '0'
  }
}

export function formatUsdAmount(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

export function emptyBalance(family: ChainFamily): string {
  // Matches the EVM adapter UX (4 decimals) and keeps other chains consistent.
  switch (family) {
    case ChainFamily.EVM:
      return '0.0000'
    default:
      return '0.0000'
  }
}

async function fetchAccountAssets(
  address: string,
  networks: string[]
): Promise<ChainToken[]> {
  const body: AccountAssetsRequest = {
    addresses: [{ address, networks }],
  }

  const res = await fetch(ACCOUNT_ASSETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`account_assets failed: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as AccountAssetsResponse
  return json.data.tokens ?? []
}

function usdUnitPrice(token: ChainToken): number {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  const n = p ? Number(p.value) : 0
  return Number.isFinite(n) ? n : 0
}

function toDisplayTokensForNetwork(
  tokens: ChainToken[],
  chain: Chain,
  displayDecimals: number
): { displayTokens: DisplayToken[]; nativeBalance: string; totalUsd: number } {
  let totalUsd = 0
  let nativeBalance = emptyBalance(ChainFamily.EVM)

  const displayTokens: DisplayToken[] = tokens.map((t) => {
    const isNative = t.tokenAddress == null
    const decimals =
      (t.tokenMetadata?.decimals ?? null) != null
        ? t.tokenMetadata.decimals!
        : 18

    const symbol =
      (t.tokenMetadata?.symbol ?? null) != null
        ? t.tokenMetadata.symbol!
        : isNative
          ? chain.symbol
          : 'UNKNOWN'

    const name =
      (t.tokenMetadata?.name ?? null) != null
        ? t.tokenMetadata.name!
        : isNative
          ? chain.name
          : symbol

    const qtyStr = formatTokenQuantity(
      t.tokenBalance,
      decimals,
      displayDecimals
    )

    const qtyNum = Number(qtyStr)
    if (Number.isFinite(qtyNum) && qtyNum > 0) {
      totalUsd += qtyNum * usdUnitPrice(t)
    }

    if (isNative) nativeBalance = qtyStr

    return {
      symbol,
      name,
      balance: qtyStr,
      isNative,
      address: t.tokenAddress ?? undefined,
      decimals: isNative ? undefined : decimals,
    }
  })

  // Put native first for consistent UI
  displayTokens.sort((a, b) => Number(b.isNative) - Number(a.isNative))

  return { displayTokens, nativeBalance, totalUsd }
}

export type AccountBalancesResult = {
  nativeBalance: string
  /** Sum of USD value across all requested networks (formatted). */
  totalAssetUsd: string
  /** USD value on the active chain’s `account_assets` network only (formatted). */
  currentChainUsd: string
  tokens: DisplayToken[]
}

export function displayTokensFromChainTokens(
  tokens: ChainToken[],
  chain: Chain,
  displayDecimals = 4
): DisplayToken[] {
  return toDisplayTokensForNetwork(tokens, chain, displayDecimals).displayTokens
}

function sumUsdAcrossTokens(
  tokens: ChainToken[],
  displayDecimals = 18
): number {
  // We must decode quantities to compute portfolio value; `tokenPrices.value` is a unit price.
  // Use high precision decimals when decoding; final UI formatting is handled elsewhere.
  let total = 0
  for (const t of tokens) {
    const decimals =
      (t.tokenMetadata?.decimals ?? null) != null
        ? t.tokenMetadata.decimals!
        : 18
    // Note: we use a high displayDecimals purely to preserve precision when
    // parsing to number; this is still a best-effort approximation.
    const qtyStr = formatTokenQuantity(
      t.tokenBalance,
      decimals,
      displayDecimals
    )
    const qtyNum = Number(qtyStr)
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) continue
    const unit = usdUnitPrice(t)
    if (!Number.isFinite(unit) || unit <= 0) continue
    total += qtyNum * unit
  }
  return total
}

export async function fetchAccountBalances(
  address: string,
  chains: Chain[],
  activeChain: Chain
  // importedTokens: TokenInfo[] = []
): Promise<AccountBalancesResult> {
  const family = activeChain.family ?? ChainFamily.EVM
  const activeNetwork = chainToAccountAssetsNetwork(activeChain)

  // Chains with a mapped `account_assets` network (EVM chainId or Alchemy slug id).
  const networks = Array.from(
    new Set(
      chains
        .map((c) => chainToAccountAssetsNetwork(c))
        .filter((n): n is string => Boolean(n))
    )
  )

  if (networks.length == 0) {
    return emptyAccountBalancesResult(activeChain, family)
  }

  try {
    const fetched = await fetchAccountAssets(address, networks)

    // Separate tokens by network and cache into ChainTokens model.
    const byNetwork = new Map<string, ChainToken[]>()
    for (const t of fetched) {
      const list = byNetwork.get(t.network) ?? []
      list.push(t)
      byNetwork.set(t.network, list)
    }
    for (const [n, list] of byNetwork) {
      const networkUsd = sumUsdAcrossTokens(list, 18)
      cacheTokensForNetwork(n, list, formatUsdAmount(networkUsd))
    }

    const activeTokens = activeNetwork
      ? (byNetwork.get(activeNetwork) ?? [])
      : []
    const { displayTokens, nativeBalance } = toDisplayTokensForNetwork(
      activeTokens,
      activeChain,
      4
    )
    const totalUsd = sumUsdAcrossTokens(fetched, 18)
    const currentUsd = sumUsdAcrossTokens(activeTokens, 18)
    const totalAssetUsd = formatUsdAmount(totalUsd)
    const currentChainUsd = formatUsdAmount(currentUsd)
    notifyTokenCacheUpdated()

    return {
      nativeBalance,
      totalAssetUsd,
      currentChainUsd,
      tokens: displayTokens,
    }
  } catch (error) {
    console.error('Failed to fetch account assets:', error)
    return emptyAccountBalancesResult(activeChain, family, {
      skipNotify: true,
    })
  }
}

function emptyAccountBalancesResult(
  activeChain: Chain,
  family: ChainFamily,
  opts?: { skipNotify?: boolean }
): AccountBalancesResult {
  const zero = emptyBalance(family)
  const z = formatUsdAmount(0)
  if (!opts?.skipNotify) {
    notifyTokenCacheUpdated()
  }
  return {
    nativeBalance: zero,
    totalAssetUsd: z,
    currentChainUsd: z,
    tokens: [
      {
        symbol: activeChain.symbol || 'UNKNOWN',
        name: activeChain.name,
        balance: zero,
        isNative: true,
      },
    ],
  }
}

/*
 * Optional RPC adapter fallback (native + imported tokens via `balanceAdapterRegistry`).
 * Uncomment this and the imports below when you want on-chain balances when
 * `account_assets` fails or for chains without a mapped `account_assets` network.
 *
 * import { balanceAdapterRegistry } from './balanceAdapterRegistry'
 * import './adapters'
 *
 * async function fallbackBalance(
 *   address: string,
 *   activeChain: Chain,
 *   importedTokens: TokenInfo[]
 * ): Promise<AccountBalancesResult> {
 *   const family = activeChain.family ?? ChainFamily.EVM
 *   const adapter = balanceAdapterRegistry.get(family)
 *   if (!adapter) {
 *     return emptyAccountBalancesResult(activeChain, family)
 *   }
 *
 *   const native = await adapter.fetchNativeBalance(address, activeChain)
 *   const displayTokens: DisplayToken[] = [
 *     {
 *       symbol: activeChain.symbol || 'UNKNOWN',
 *       name: activeChain.name,
 *       balance: native,
 *       isNative: true,
 *     },
 *   ]
 *
 *   if (adapter.supportsTokens && importedTokens.length > 0) {
 *     const tokenBalances = await adapter.fetchTokenBalances(
 *       address,
 *       activeChain,
 *       importedTokens
 *     )
 *     displayTokens.push(
 *       ...tokenBalances.map((t) => ({
 *         symbol: t.symbol,
 *         name: t.name,
 *         balance: t.balance,
 *         isNative: false,
 *         address: t.address,
 *         decimals: t.decimals,
 *       }))
 *     )
 *   }
 *
 *   return {
 *     nativeBalance: native,
 *     totalAssetUsd: formatUsdAmount(0),
 *     tokens: displayTokens,
 *   }
 * }
 */
