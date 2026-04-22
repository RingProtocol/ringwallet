import { formatUnits } from 'ethers'
import {
  chainToAccountAssetsNetwork,
  DEFAULT_CHAINS,
} from '../../config/chains'
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

/**
 * Balances from local RPC adapters, not `account_assets`.
 * Plasma: numeric ids 9745 / 9746. MegaETH: 6342 (testnet), 4326 (mainnet slug map).
 * Tron: all `ChainFamily.Tron` (mainnet + Shasta).
 * Solana devnet/testnet: `account_assets` rejects e.g. `solana-devnet`; mainnet-beta may use the API.
 */
function usesAdapterOnlyAccountAssetsSync(c: Chain): boolean {
  if (c.family === ChainFamily.Bitcoin || c.family === ChainFamily.Tron) {
    return true
  }
  if (
    c.family === ChainFamily.Solana &&
    c.cluster != null &&
    c.cluster !== 'mainnet-beta'
  ) {
    return true
  }
  const { id } = c
  //prisma
  if (id === 9745 || id === 9746) return true
  if (id === '9745' || id === '9746') return true
  //megaeth
  if (id === 6342 || id === 4326) return true
  if (id === '6342' || id === '4326') return true
  return false
}

const ADAPTER_ONLY_ACCOUNT_ASSET_NETWORKS: Set<string> = (() => {
  const s = new Set<string>()
  for (const c of DEFAULT_CHAINS) {
    if (!usesAdapterOnlyAccountAssetsSync(c)) continue
    const slug = chainToAccountAssetsNetwork(c)
    if (slug) s.add(slug)
  }
  return s
})()

function accountAssetGroupsForAccountAssetsApi(
  groups: AccountAssetsAddressEntry[]
): AccountAssetsAddressEntry[] {
  return groups
    .map((g) => ({
      address: g.address,
      networks: g.networks.filter(
        (n) => !ADAPTER_ONLY_ACCOUNT_ASSET_NETWORKS.has(n)
      ),
    }))
    .filter((g) => g.networks.length > 0)
}

/** One wallet address and the `account_assets` network slugs to query for it. */
export type AccountAssetsAddressEntry = {
  address: string
  networks: string[]
}

type AccountAssetsRequest = {
  addresses: AccountAssetsAddressEntry[]
}

type AccountAssetsResponse = {
  data: {
    tokens: ChainToken[]
    pageKey?: string
  }
}

function defaultTokenMetadata(): ChainToken['tokenMetadata'] {
  return { decimals: null, logo: null, name: null, symbol: null }
}

function nativeDecimalsForChainFamily(family: ChainFamily | undefined): number {
  switch (family) {
    case ChainFamily.Solana:
      return 9
    case ChainFamily.Tron:
      return 6
    case ChainFamily.Bitcoin:
    case ChainFamily.Dogecoin:
      return 8
    default:
      return 18
  }
}

function chainForAccountAssetsNetwork(network: string): Chain | undefined {
  return DEFAULT_CHAINS.find((c) => chainToAccountAssetsNetwork(c) === network)
}

/**
 * `account_assets` often returns native rows with `tokenAddress: null` and
 * missing or all-null `tokenMetadata`; testnets may have empty `tokenPrices`.
 */
function normalizeAccountAssetToken(raw: ChainToken): ChainToken {
  const metaIn = raw.tokenMetadata
  const base =
    metaIn == null
      ? defaultTokenMetadata()
      : {
          decimals: metaIn.decimals ?? null,
          logo: metaIn.logo ?? null,
          name: metaIn.name ?? null,
          symbol: metaIn.symbol ?? null,
        }

  const isNative = raw.tokenAddress == null
  const chain = isNative ? chainForAccountAssetsNetwork(raw.network) : undefined

  let decimals = base.decimals
  if (decimals == null && isNative) {
    decimals = nativeDecimalsForChainFamily(chain?.family ?? ChainFamily.EVM)
  }

  return {
    address: raw.address ?? '',
    network: raw.network,
    tokenAddress: raw.tokenAddress,
    tokenBalance: raw.tokenBalance,
    tokenMetadata: {
      decimals,
      logo: base.logo,
      name: base.name ?? (isNative && chain ? chain.name : null),
      symbol: base.symbol ?? (isNative && chain ? chain.symbol : null),
    },
    tokenPrices: Array.isArray(raw.tokenPrices) ? raw.tokenPrices : [],
  }
}

function normalizeAccountAssetsTokens(tokens: ChainToken[]): ChainToken[] {
  return tokens.map(normalizeAccountAssetToken)
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
    case ChainFamily.Prisma:
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
  const sym = token.tokenMetadata?.symbol
  if (sym) return sym
  if (token.tokenAddress == null) return chain.symbol
  return 'UNKNOWN'
}

export function chainTokenDisplayName(token: ChainToken, chain: Chain): string {
  const name = token.tokenMetadata?.name
  if (name) return name
  if (token.tokenAddress == null) return chain.name
  return chainTokenDisplaySymbol(token, chain)
}

export function formatChainTokenBalance(
  token: ChainToken,
  chain: Chain,
  displayDecimals: number
): string {
  const decimals = token.tokenMetadata?.decimals ?? 18
  return formatTokenQuantity(token.tokenBalance, decimals, displayDecimals)
}

export function chainTokenPositionUsd(token: ChainToken): number {
  const decimals = token.tokenMetadata?.decimals ?? 18
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

export { partitionTokens, isSuspiciousFakeToken } from './fakeTokenDetector'

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
  addresses: AccountAssetsAddressEntry[]
): Promise<ChainToken[]> {
  const body: AccountAssetsRequest = {
    addresses: addresses.filter(
      (a) => a.address.length > 0 && a.networks.length > 0
    ),
  }
  if (body.addresses.length === 0) {
    return []
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
  const raw = (json.data.tokens ?? []) as ChainToken[]
  return normalizeAccountAssetsTokens(raw)
}

function sumUsdAcrossTokens(
  tokens: ChainToken[],
  displayDecimals = 18
): number {
  let total = 0
  for (const t of tokens) {
    const decimals =
      (t.tokenMetadata?.decimals ?? null) != null
        ? t.tokenMetadata!.decimals!
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
  adapterAddress: string,
  activeChain: Chain,
  accountAssetGroups: AccountAssetsAddressEntry[]
): Promise<void> {
  if (activeChain == null) return

  if (usesAdapterOnlyAccountAssetsSync(activeChain)) {
    const result = await fetchAccountBalanceByAdapter(
      adapterAddress,
      activeChain
    )
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
    const fetched = await fetchAccountAssets(
      accountAssetGroupsForAccountAssetsApi(accountAssetGroups)
    )

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

  await syncAccountBalancesToCache(address, activeChain, [
    { address, networks: allChains },
  ])
  return readAccountBalancesFromCache(activeChain, allChains)
}
