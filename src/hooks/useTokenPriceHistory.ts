import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChainToken } from '../models/ChainTokens'
import type { Chain } from '../models/ChainType'
import { chainToAccountAssetsNetwork } from '../config/chains'
import {
  fetchTokenPriceHistorical,
  type PriceDataPoint,
  type TokenPriceHistoricalRequest,
} from '../features/balance/tokenPriceHistorical'

export type PriceTab = '1H' | '1D'

const TAB_CONFIG: Record<PriceTab, { interval: string; lookbackMs: number }> = {
  '1H': { interval: '5m', lookbackMs: 60 * 60 * 1000 },
  '1D': { interval: '1h', lookbackMs: 24 * 60 * 60 * 1000 },
}

export interface UseTokenPriceHistoryResult {
  data: PriceDataPoint[]
  isLoading: boolean
  hasPrice: boolean
  selectedTab: PriceTab
  setSelectedTab: (tab: PriceTab) => void
}

export function useTokenPriceHistory(
  token: ChainToken,
  chain: Chain
): UseTokenPriceHistoryResult {
  const [data, setData] = useState<PriceDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<PriceTab>('1D')

  const abortRef = useRef<AbortController | null>(null)

  const hasPriceData =
    Array.isArray(token.tokenPrices) && token.tokenPrices.length > 0

  const isNative = token.tokenAddress == null
  const network = chainToAccountAssetsNetwork(chain)
  const tokenAddress = token.tokenAddress ?? undefined
  const symbol = token.tokenMetadata?.symbol ?? chain.symbol ?? undefined

  const fetchKey = isNative
    ? `sym:${symbol}`
    : `addr:${network}:${tokenAddress}`

  const doFetch = useCallback(
    async (tab: PriceTab) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const cfg = TAB_CONFIG[tab]
      const now = Date.now()
      const endTime = new Date(now).toISOString()
      const startTime = new Date(now - cfg.lookbackMs).toISOString()

      let params: TokenPriceHistoricalRequest
      if (isNative) {
        if (!symbol) return
        params = { symbol, startTime, endTime, interval: cfg.interval }
      } else {
        if (!network || !tokenAddress) return
        params = {
          network,
          address: tokenAddress,
          startTime,
          endTime,
          interval: cfg.interval,
        }
      }

      setIsLoading(true)
      try {
        const points = await fetchTokenPriceHistorical(
          params,
          controller.signal
        )
        if (!controller.signal.aborted) {
          setData(points)
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Failed to fetch price history:', err)
        if (!controller.signal.aborted) {
          setData([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [isNative, symbol, network, tokenAddress]
  )

  useEffect(() => {
    if (!hasPriceData) {
      setData([])
      setIsLoading(false)
      return
    }
    void doFetch(selectedTab)
    return () => {
      abortRef.current?.abort()
    }
  }, [selectedTab, fetchKey, doFetch, hasPriceData])

  const hasPrice = hasPriceData || data.length > 0

  return { data, isLoading, hasPrice, selectedTab, setSelectedTab }
}
