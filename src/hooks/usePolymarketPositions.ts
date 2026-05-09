import { useState, useEffect, useCallback } from 'react'
import { fetchPositions } from '../services/polymarket/polymarketSubgraphService'
import { useI18n } from '../i18n'

export interface PositionItem {
  marketId: string
  question: string
  slug: string
  image: string
  outcomeIndex: number
  outcome: string
  quantity: string
  avgPrice: string
  currentPrice: string
  estimatedValue: string
  pnl: string
}

export interface UsePolymarketPositionsReturn {
  positions: PositionItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePolymarketPositions(
  walletAddress: string | null,
  provider: unknown | null
): UsePolymarketPositionsReturn {
  const { t } = useI18n()
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!walletAddress) {
      setPositions([])
      return
    }
    setLoading(true)
    setError(null)

    try {
      const subgraphPositions = await fetchPositions(walletAddress)
      const items: PositionItem[] = subgraphPositions.map((p) => {
        const prices = safeJsonParse<string[]>(p.market.outcomePrices) ?? []
        const outcomes = safeJsonParse<string[]>(p.market.outcomes) ?? []
        const currentPrice = prices[p.outcomeIndex] ?? '0'
        const avg = parseFloat(p.avgPrice) || 0
        const qty = parseFloat(p.quantity) || 0
        const current = parseFloat(currentPrice) || 0
        const estValue = qty * current
        const cost = qty * avg
        const pnl = estValue - cost

        return {
          marketId: p.market.id,
          question: p.market.question,
          slug: p.market.slug,
          image: p.market.image,
          outcomeIndex: p.outcomeIndex,
          outcome: outcomes[p.outcomeIndex] ?? `Outcome ${p.outcomeIndex}`,
          quantity: p.quantity,
          avgPrice: avg.toFixed(3),
          currentPrice: current.toFixed(3),
          estimatedValue: estValue.toFixed(2),
          pnl: pnl.toFixed(2),
        }
      })
      setPositions(items)
    } catch (err) {
      // Fallback: try contract direct query if provider available
      if (provider) {
        try {
          setPositions([]) // Contract fallback would need tokenId list; simplified for now
        } catch {
          /* ignore */
        }
      }
      setError(
        err instanceof Error
          ? err.message
          : t('loadingFailed', { error: 'Subgraph unavailable' })
      )
    } finally {
      setLoading(false)
    }
  }, [walletAddress, provider, t])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { positions, loading, error, refetch: fetch }
}

function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
