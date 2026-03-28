import { useState, useEffect, useCallback } from 'react'
import type { DAppInfo, DAppCategory } from '../types/dapp'
import { fetchDAppList, getCache } from '../services/dappService'

export function useDAppList() {
  const [dapps, setDapps] = useState<DAppInfo[]>([])
  const [categories, setCategories] = useState<DAppCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const cached = getCache()

    setError(null)

    if (cached?.data) {
      setDapps(cached.data.dapps)
      setCategories(cached.data.categories)
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchDAppList()
      setDapps(data.dapps)
      console.log("dapplist>>data=", data)
      console.log('categories==', data.categories)
      setCategories(data.categories)
    } catch (err) {
      if (!cached?.data) {
        setError((err as Error).message || 'Failed to load DApps')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { dapps, categories, loading, error, reload: load }
}
