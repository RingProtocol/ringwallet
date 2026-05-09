import { useState, useEffect, useCallback } from 'react'
import { fetchOrders } from '../services/polymarket/polymarketSubgraphService'
import { useI18n } from '../i18n'

export interface OrderItem {
  id: string
  marketQuestion: string
  marketSlug: string
  outcomeIndex: number
  side: string
  makerAmount: string
  takerAmount: string
  price: string
  status: string
  transactionHash: string
  timestamp: string
}

export interface UsePolymarketOrdersReturn {
  orders: OrderItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePolymarketOrders(
  walletAddress: string | null
): UsePolymarketOrdersReturn {
  const { t } = useI18n()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!walletAddress) {
      setOrders([])
      return
    }
    setLoading(true)
    setError(null)

    try {
      const subgraphOrders = await fetchOrders(walletAddress)
      const items: OrderItem[] = subgraphOrders.map((o) => ({
        id: o.id,
        marketQuestion: o.market?.question ?? '',
        marketSlug: o.market?.slug ?? '',
        outcomeIndex: o.outcomeIndex,
        side: o.side,
        makerAmount: o.makerAmount,
        takerAmount: o.takerAmount,
        price: o.price,
        status: o.status,
        transactionHash: o.transactionHash,
        timestamp: o.timestamp,
      }))
      setOrders(items)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('loadingFailed', { error: 'Subgraph unavailable' })
      )
    } finally {
      setLoading(false)
    }
  }, [walletAddress, t])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { orders, loading, error, refetch: fetch }
}
