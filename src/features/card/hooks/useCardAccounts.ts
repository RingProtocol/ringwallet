import { useState, useCallback, useEffect } from 'react'
import { useCardProvider } from './useCardProvider'
import {
  getCardAccounts as getCardAccountsFromCache,
  setCardAccounts,
} from '../services/cardStorage'
import type { CardAccount } from '../types'

export function useCardAccounts() {
  const { adapter, loading: adapterLoading } = useCardProvider()
  const [accounts, setAccounts] = useState<CardAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!adapter) {
      setAccounts([])
      setLoading(false)
      return
    }

    // Cache-first strategy: show cached data immediately
    const cached = getCardAccountsFromCache()
    if (cached.length > 0) {
      setAccounts(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const cards = await adapter.getCards()
      setAccounts(cards)
      setCardAccounts(cards)
    } catch (err) {
      if (cached.length === 0) {
        setError((err as Error).message || 'Failed to load card accounts')
      }
    } finally {
      setLoading(false)
    }
  }, [adapter])

  useEffect(() => {
    if (!adapterLoading) {
      load()
    }
  }, [load, adapterLoading])

  const activeCard = accounts.length > 0 ? accounts[0] : null

  return { accounts, activeCard, loading, error, reload: load }
}
