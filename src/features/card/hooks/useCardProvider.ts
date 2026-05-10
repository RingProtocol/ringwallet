import { useState, useEffect } from 'react'
import { cardProviderRegistry } from '../services/registry'

export function useCardProvider(providerId?: string) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [providerId])

  const adapter = providerId
    ? cardProviderRegistry.get(providerId) ?? null
    : cardProviderRegistry.getActiveProvider() ?? null

  return { adapter, loading }
}
