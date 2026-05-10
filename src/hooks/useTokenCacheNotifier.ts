import { useEffect, useState } from 'react'
import { subscribeTokenCache } from '../models/ChainTokens'

/** Bumps when the shared ChainTokens cache is updated (balances / USD totals). */
export function useTokenCacheNotifier(): number {
  const [generation, setGeneration] = useState(0)
  useEffect(
    () =>
      subscribeTokenCache(() => {
        setGeneration((n) => n + 1)
      }),
    []
  )
  return generation
}
