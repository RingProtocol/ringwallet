import { useState, useEffect, useCallback } from 'react'
import type { DAppInfo, DAppCategory } from '../types/dapp'
import { fetchDAppList } from '../services/dappService'

function getTestDappApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('testdapp')
}

export function useDAppList() {
  const [dapps, setDapps] = useState<DAppInfo[]>([])
  const [categories, setCategories] = useState<DAppCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDAppList()
      const testKey = getTestDappApiKey()
      setDapps(data.dapps.filter(d =>
        d.status === 'active' || (testKey && d.apikey === testKey)
      ))
      setCategories(data.categories)
    } catch (err) {
      setError((err as Error).message || 'Failed to load DApps')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { dapps, categories, loading, error, reload: load }
}
