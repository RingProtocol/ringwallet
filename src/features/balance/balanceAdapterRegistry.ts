import { formatUnits } from 'ethers'
import type { Chain, ChainFamily } from '../../models/ChainType'
import type { ChainToken } from '../../models/ChainTokens'
import type { AccountBalancesResult, BalanceAdapter } from './balanceTypes'

class BalanceAdapterRegistry {
  private adapters = new Map<ChainFamily, BalanceAdapter>()

  register(adapter: BalanceAdapter): void {
    this.adapters.set(adapter.family, adapter)
  }

  get(family: ChainFamily): BalanceAdapter | undefined {
    return this.adapters.get(family)
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

function usdUnitPrice(token: ChainToken): number {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  const n = p ? Number(p.value) : 0
  return Number.isFinite(n) ? n : 0
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

export async function fetchAccountBalanceByAdapter(
  address: string,
  activeChain: Chain
): Promise<AccountBalancesResult | null> {
  const adapter = balanceAdapterRegistry.get(activeChain.family!)
  if (!adapter) return null

  const [native, tokens] = await Promise.all([
    adapter.fetchNativeBalance(address, activeChain),
    adapter.supportsTokens
      ? adapter.fetchTokenBalances(address, activeChain, [])
      : Promise.resolve([]),
  ])

  const allTokens = [native, ...tokens]
  const nativeDecimals = native.tokenMetadata.decimals ?? 18
  const nativeBalance = formatTokenQuantity(
    native.tokenBalance,
    nativeDecimals,
    adapter.displayDecimals
  )

  // For adapter-only paths we typically have no prices, but keep best-effort parity.
  const totalUsd = sumUsdAcrossTokens(allTokens, 18)
  const totalAssetUsd = totalUsd.toFixed(2)
  const currentChainUsd = totalAssetUsd

  return {
    nativeBalance,
    totalAssetUsd,
    currentChainUsd,
    tokens: allTokens,
  }
}

export const balanceAdapterRegistry = new BalanceAdapterRegistry()
