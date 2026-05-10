import { useState, useCallback, useEffect } from 'react'
import { useCardProvider } from './useCardProvider'
import { useCardAccounts } from './useCardAccounts'
import {
  getCardTransactions as getCardTransactionsFromCache,
  setCardTransactions,
} from '../services/cardStorage'
import type { CardTransaction } from '../types'

const DEFAULT_PAGE_SIZE = 20

export function useCardTransactions(pageSize = DEFAULT_PAGE_SIZE) {
  const { adapter, loading: adapterLoading } = useCardProvider()
  const { activeCard } = useCardAccounts()

  const [transactions, setTransactions] = useState<CardTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(
    async (pageNum: number, append = false) => {
      if (!adapter || !activeCard) {
        setTransactions([])
        setLoading(false)
        return
      }

      // Cache-first for first page (only rows for this card)
      if (pageNum === 1 && !append) {
        const cached = getCardTransactionsFromCache().filter(
          (tx) => tx.cardId === activeCard.id,
        )
        if (cached.length > 0) {
          setTransactions(cached)
          setLoading(false)
        } else {
          setLoading(true)
        }
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        const result = await adapter.getTransactions(activeCard.id, {
          page: pageNum,
          pageSize,
        })

        if (append) {
          setTransactions((prev) => [...prev, ...result.items])
        } else {
          setTransactions(result.items)
        }

        setHasMore(result.hasMore)

        // Update cache on first page load
        if (pageNum === 1) {
          setCardTransactions(result.items)
        }
      } catch (err) {
        if (pageNum === 1 && !append) {
          const cached = getCardTransactionsFromCache().filter(
            (tx) => tx.cardId === activeCard.id,
          )
          if (cached.length === 0) {
            setError((err as Error).message || 'Failed to load transactions')
          }
        } else {
          setError((err as Error).message || 'Failed to load transactions')
        }
      } finally {
        setLoading(false)
      }
    },
    [adapter, activeCard, pageSize],
  )

  useEffect(() => {
    if (adapterLoading) return
    if (!activeCard) {
      setTransactions([])
      setLoading(false)
      setPage(1)
      return
    }
    setPage(1)
    void load(1)
  }, [load, adapterLoading, activeCard?.id])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    load(nextPage, true)
  }, [page, load])

  const refresh = useCallback(() => {
    setPage(1)
    load(1)
  }, [load])

  return {
    transactions,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
  }
}
