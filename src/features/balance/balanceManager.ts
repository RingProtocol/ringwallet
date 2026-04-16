import { formatUnits } from 'ethers'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import { ChainFamily, type Chain } from '../../models/ChainType'
import {
  cacheTokensForNetwork,
  getTokensForNetwork,
  type ChainToken,
  notifyTokenCacheUpdated,
} from '../../models/ChainTokens'
import type { AccountBalancesResult } from './balanceTypes'
import { fetchAccountBalanceByAdapter } from './balanceAdapterRegistry'

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
  address: string
  networks: string[]
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
  switch (family) {
    case ChainFamily.EVM:
      return '0.0000'
    default:
      return '0.0000'
  }
}

export function sortChainTokensForDisplay(tokens: ChainToken[]): ChainToken[] {
  return [...tokens].sort(
    (a, b) => Number(b.tokenAddress == null) - Number(a.tokenAddress == null)
  )
}

function usdUnitPrice(token: ChainToken): number {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  const n = p ? Number(p.value) : 0
  return Number.isFinite(n) ? n : 0
}

export function chainTokenDisplaySymbol(
  token: ChainToken,
  chain: Chain
): string {
  if (token.tokenMetadata.symbol) return token.tokenMetadata.symbol
  if (token.tokenAddress == null) return chain.symbol
  return 'UNKNOWN'
}

export function chainTokenDisplayName(token: ChainToken, chain: Chain): string {
  if (token.tokenMetadata.name) return token.tokenMetadata.name
  if (token.tokenAddress == null) return chain.name
  return chainTokenDisplaySymbol(token, chain)
}

export function formatChainTokenBalance(
  token: ChainToken,
  chain: Chain,
  displayDecimals: number
): string {
  const decimals = token.tokenMetadata.decimals ?? 18
  return formatTokenQuantity(token.tokenBalance, decimals, displayDecimals)
}

export function chainTokenPositionUsd(token: ChainToken): number {
  const decimals = token.tokenMetadata.decimals ?? 18
  const qtyStr = formatTokenQuantity(token.tokenBalance, decimals, 18)
  const qtyNum = Number(qtyStr)
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0
  const unit = usdUnitPrice(token)
  if (!Number.isFinite(unit) || unit <= 0) return 0
  return qtyNum * unit
}

export function formatChainTokenPositionUsd(token: ChainToken): string {
  return formatUsdAmount(chainTokenPositionUsd(token))
}

export function chainTokenChangePercentLabel(token: ChainToken): string | null {
  const usd = token.tokenPrices?.find(
    (x) => x.currency?.toLowerCase() === 'usd'
  )
  const raw = usd?.changePercent24h
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (Number.isFinite(n)) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
  }
  return String(raw)
}

/** Formatted USD unit price from `tokenPrices`, or em dash when missing. */
export function formatUsdUnitPrice(token: ChainToken): string {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  if (!p) return '—'
  const n = Number(p.value)
  if (!Number.isFinite(n)) return '—'
  return formatUsdAmount(n)
}

function nativeBalanceFromTokens(
  sortedTokens: ChainToken[],
  chain: Chain,
  displayDecimals: number
): string {
  const native = sortedTokens.find((t) => t.tokenAddress == null)
  if (!native) return emptyBalance(chain.family ?? ChainFamily.EVM)
  return formatChainTokenBalance(native, chain, displayDecimals)
}

async function fetchAccountAssets(
  address: string,
  networks: string[]
): Promise<ChainToken[]> {
  const body: AccountAssetsRequest = { address, networks }

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

function sumUsdAcrossTokens(
  tokens: ChainToken[],
  displayDecimals = 18
): number {
  let total = 0
  for (const t of tokens) {
    const decimals =
      (t.tokenMetadata?.decimals ?? null) != null
        ? t.tokenMetadata.decimals!
        : 18
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

/**
 * Read balances for the active chain from the in-memory token cache (see `ChainTokens`).
 * Safe to call synchronously on chain switch; shows zeros when nothing is cached yet.
 */
export function readAccountBalancesFromCache(
  activeChain: Chain,
  portfolioNetworkSlugs: string[]
): AccountBalancesResult {
  const family = activeChain.family ?? ChainFamily.EVM
  const activeNetwork = chainToAccountAssetsNetwork(activeChain) ?? ''
  const cachedActive =
    activeNetwork.length > 0 ? getTokensForNetwork(activeNetwork) : undefined
  const sortedActive = cachedActive?.length
    ? sortChainTokensForDisplay([...cachedActive])
    : []

  const nativeBalance =
    sortedActive.length > 0
      ? nativeBalanceFromTokens(sortedActive, activeChain, 4)
      : emptyBalance(family)

  let totalUsd = 0
  for (const n of portfolioNetworkSlugs) {
    if (!n) continue
    const list = getTokensForNetwork(n)
    if (list?.length) totalUsd += sumUsdAcrossTokens(list, 18)
  }

  const currentUsd =
    sortedActive.length > 0 ? sumUsdAcrossTokens(sortedActive, 18) : 0

  return {
    nativeBalance,
    totalAssetUsd: formatUsdAmount(totalUsd),
    currentChainUsd: formatUsdAmount(currentUsd),
    tokens: sortedActive,
  }
}

/**
 * Fetches remote balances and writes per-network rows into `ChainTokens` cache.
 * Call on an interval; UI should read via `readAccountBalancesFromCache`.
 */
export async function syncAccountBalancesToCache(
  address: string,
  activeChain: Chain,
  portfolioNetworkSlugs: string[]
): Promise<void> {
  if (activeChain == null) return

  if (
    activeChain.family === ChainFamily.Bitcoin ||
    activeChain.id === 'tron-mainnet' ||
    activeChain.id === 'plasma-mainnet'
  ) {
    const result = await fetchAccountBalanceByAdapter(address, activeChain)
    if (result == null) return
    const net = chainToAccountAssetsNetwork(activeChain)
    if (net == null) return
    const networkUsd = sumUsdAcrossTokens(result.tokens, 18)
    cacheTokensForNetwork(net, result.tokens, formatUsdAmount(networkUsd))
    notifyTokenCacheUpdated()
    return
  }

  const activeNetwork = chainToAccountAssetsNetwork(activeChain)
  if (activeNetwork == null) return

  try {
    const fetched = await fetchAccountAssets(address, portfolioNetworkSlugs)

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
    notifyTokenCacheUpdated()
  } catch (error) {
    console.error('Failed to fetch account assets:', error)
  }
}

//for test
export async function fetchAccountBalances(
  address: string,
  activeChain: Chain,
  allChains: string[]
): Promise<AccountBalancesResult | null> {
  if (activeChain == null) {
    return null
  }

  await syncAccountBalancesToCache(address, activeChain, allChains)
  return readAccountBalancesFromCache(activeChain, allChains)
}
