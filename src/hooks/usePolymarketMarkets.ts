import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  fetchPolymarketMarkets,
  filterMarketsByCategory,
  type PolymarketMarket,
  type MarketCategory,
} from '../services/polymarketService'
import { useI18n } from '../i18n'

const PAGE_SIZE = 20

export interface UsePolymarketMarketsReturn {
  markets: PolymarketMarket[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  activeCategory: MarketCategory
  setActiveCategory: (category: MarketCategory) => void
  loadMarkets: (isInitial: boolean) => Promise<void>
  handleRetry: () => void
}

export function usePolymarketMarkets(): UsePolymarketMarketsReturn {
  const { t } = useI18n()
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([])
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)

  const markets = useMemo(
    () => filterMarketsByCategory(allMarkets, activeCategory),
    [allMarkets, activeCategory]
  )

  const loadMarkets = useCallback(
    async (isInitial: boolean) => {
      if (isInitial) {
        setLoading(true)
        offsetRef.current = 0
      } else {
        if (loadingMoreRef.current || !hasMoreRef.current) return
        setLoadingMore(true)
        loadingMoreRef.current = true
      }
      setError(null)

      try {
        const data = await fetchPolymarketMarkets(PAGE_SIZE, offsetRef.current)
        if (isInitial) {
          setAllMarkets(data)
        } else {
          setAllMarkets((prev) => [...prev, ...data])
        }
        const more = data.length === PAGE_SIZE
        setHasMore(more)
        hasMoreRef.current = more
        offsetRef.current += data.length
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('loadingFailed', { error: 'Unknown error' })
        )
      } finally {
        setLoading(false)
        setLoadingMore(false)
        loadingMoreRef.current = false
      }
    },
    [t]
  )

  useEffect(() => {
    loadMarkets(true)
  }, [])

  const handleRetry = useCallback(() => {
    loadMarkets(true)
  }, [loadMarkets])

  const handleCategoryChange = useCallback(
    (category: MarketCategory) => {
      setActiveCategory(category)
      setAllMarkets([])
      setHasMore(true)
      hasMoreRef.current = true
      offsetRef.current = 0
      setLoading(true)
      loadMarkets(true)
    },
    [loadMarkets]
  )

  return {
    markets,
    loading,
    loadingMore,
    error,
    hasMore,
    activeCategory,
    setActiveCategory: handleCategoryChange,
    loadMarkets,
    handleRetry,
  }
}
