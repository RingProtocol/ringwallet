/**
 * Earn strategies with REAL APY/APR data, sourced on-chain (Lido) and from
 * Morpho's public API. Replaces `@ring-protocol/ringearnsdk/react`'s
 * `useStrategies`, which returns hard-coded values (3.2% Lido, 6.8% Morpho).
 *
 * Lido APR: pulled from Lido's own on-chain `Rebase` events via the
 *   Lido SDK's `statistics.apr.getLastApr()`. The SDK derives it from
 *   the share-rate delta of the most recent rebase — no hard-coded
 *   percentage, no off-chain API needed.
 *
 * Morpho APY: pulled from the official Morpho GraphQL API
 *   (`api.morpho.org/graphql`). The old REST endpoint
 *   `api.morpho.org/blue/vaults` was retired and now returns 404. We
 *   pick the top USDC V2 vault on Ethereum mainnet by TVL so we never
 *   pin a specific vault address that may be deprecated, and use
 *   `avgNetApy` (time-averaged) instead of the instantaneous `netApy`
 *   to avoid the supply-spike noise.
 *
 * Staking today:
 *   - Lido stake: supported via the SDK.
 *   - Morpho supply/withdraw: supported via the SDK (ERC-4626 deposit
 *     / withdraw through the Worker-backed viem account).
 */

import { useCallback, useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { LidoSDK } from '@lidofinance/lido-ethereum-sdk'

export type EarnStrategyProtocol = 'lido' | 'morpho'

export interface EarnStrategy {
  id: string
  protocol: EarnStrategyProtocol
  name: string
  asset: string
  /** Percent number, e.g. 3.5 means 3.5%. */
  apy: number
  /**
   * Underlying asset decimals. Required for correct amount parsing —
   * Lido's stETH is 18-decimal ETH, Morpho USDC vaults are 6-decimal
   * USDC. 18 by default.
   */
  decimals: number
  /** Whether the SDK can stake this strategy today. */
  stakeSupported: boolean
  /** Optional details (e.g. underlying vault address). */
  details?: string
}

const MORPHO_GRAPHQL = 'https://api.morpho.org/graphql'
// Mainnet USDC — used as the asset filter so we always pick a real
// USDC V2 vault. Filtering by symbol is not supported in the V2
// schema (`VaultV2sFilters` has `assetAddress_in`, not a symbol filter).
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

async function fetchLidoStrategy(rpcUrl: string): Promise<EarnStrategy | null> {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  })
  const sdk = new LidoSDK({ chainId: 1, rpcProvider: publicClient })
  // `getLastApr()` computes APR from the latest Rebase event's
  // pre/post share rate delta. Returned in percent (e.g. 3.5 = 3.5%).
  const apr = await sdk.statistics.apr.getLastApr()
  const value = Number(apr)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Lido APR invalid: ${apr}`)
  }
  return {
    id: 'lido-steth',
    protocol: 'lido',
    name: 'Lido stETH',
    asset: 'stETH',
    apy: value,
    decimals: 18,
    stakeSupported: true,
  }
}

interface MorphoVaultV2 {
  address?: string
  name?: string
  symbol?: string
  asset?: { symbol?: string; decimals?: number }
  avgNetApy?: number
  totalAssetsUsd?: number
}

interface GraphqlResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

async function fetchMorphoStrategy(): Promise<EarnStrategy | null> {
  // Top USDC V2 vault on Ethereum mainnet by TVL. We require
  // totalAssetsUsd >= 1000 to filter out dust.
  const query = `
    query TopUsdcVault {
      vaultV2s(
        first: 1
        where: {
          chainId_in: [1]
          assetAddress_in: ["${USDC_MAINNET}"]
          totalAssetsUsd_gte: 1000
        }
        orderBy: TotalAssetsUsd
        orderDirection: Desc
      ) {
        items {
          address
          name
          symbol
          asset { symbol decimals }
          avgNetApy
          totalAssetsUsd
        }
      }
    }
  `
  const res = await fetch(MORPHO_GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    throw new Error(`Morpho API HTTP ${res.status}`)
  }
  const json = (await res.json()) as GraphqlResponse<{
    vaultV2s?: { items?: MorphoVaultV2[] }
  }>
  if (json.errors?.length) {
    throw new Error(`Morpho API: ${json.errors[0].message}`)
  }
  const v = json.data?.vaultV2s?.items?.[0]
  if (!v) {
    throw new Error('Morpho API returned no USDC vault')
  }
  const avgApy = Number(v.avgNetApy ?? 0)
  if (!Number.isFinite(avgApy) || avgApy < 0) {
    throw new Error(`Morpho avgNetApy invalid: ${v.avgNetApy}`)
  }
  const symbol = (v.asset?.symbol ?? 'USDC').toUpperCase()
  // Use the asset's `decimals` straight from the API rather than a
  // symbol→decimals lookup table — this is authoritative and keeps
  // working for any future assets the API exposes.
  const decimals = v.asset?.decimals ?? 18
  return {
    id: `morpho-${symbol.toLowerCase()}`,
    protocol: 'morpho',
    name: v.name ?? `Morpho ${symbol} Vault`,
    asset: symbol,
    // `avgNetApy` is a decimal ratio (0.05 = 5%).
    apy: avgApy * 100,
    decimals,
    // `MorphoAdapter.supply` in @ring-protocol/ringearnsdk is fully wired now (real
    // ERC-4626 deposit through the Worker-backed viem account).
    stakeSupported: true,
    details: v.address,
  }
}

export interface UseEarnStrategiesResult {
  strategies: EarnStrategy[]
  isLoading: boolean
  /** Per-protocol error messages (empty if all succeeded). */
  errors: Partial<Record<EarnStrategyProtocol, string>>
  refetch: () => Promise<void>
}

export function useEarnStrategies(
  rpcUrl: string | null | undefined
): UseEarnStrategiesResult {
  const [strategies, setStrategies] = useState<EarnStrategy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<
    Partial<Record<EarnStrategyProtocol, string>>
  >({})

  const refetch = useCallback(async () => {
    if (!rpcUrl) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const [lido, morpho] = await Promise.allSettled([
      fetchLidoStrategy(rpcUrl),
      fetchMorphoStrategy(),
    ])
    const list: EarnStrategy[] = []
    const errs: Partial<Record<EarnStrategyProtocol, string>> = {}
    if (lido.status === 'fulfilled' && lido.value) {
      list.push(lido.value)
    } else if (lido.status === 'rejected') {
      errs.lido =
        lido.reason instanceof Error ? lido.reason.message : String(lido.reason)
    }
    if (morpho.status === 'fulfilled' && morpho.value) {
      list.push(morpho.value)
    } else if (morpho.status === 'rejected') {
      errs.morpho =
        morpho.reason instanceof Error
          ? morpho.reason.message
          : String(morpho.reason)
    }
    setStrategies(list)
    setErrors(errs)
    setIsLoading(false)
  }, [rpcUrl])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { strategies, isLoading, errors, refetch }
}
