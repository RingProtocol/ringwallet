import { useState, useEffect } from 'react'
import { cardProviderRegistry } from '../services/registry'
import type { CardProviderAdapter } from '../services/adapter/types'

export function useCardProvider(providerId?: string) {
  const [adapter, setAdapter] = useState<CardProviderAdapter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (providerId) {
      const provider = cardProviderRegistry.get(providerId)
      setAdapter(provider ?? null)
    } else {
      setAdapter(cardProviderRegistry.getActiveProvider() ?? null)
    }
    setLoading(false)
  }, [providerId])

  return { adapter, loading }
}
