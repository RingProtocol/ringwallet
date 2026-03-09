import type { DAppListResponse } from '../types/dapp'

const CACHE_KEY = 'ring_dapp_list'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  data: DAppListResponse
  timestamp: number
}

function getCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.timestamp < CACHE_TTL) return entry
    return null
  } catch {
    return null
  }
}

function setCache(data: DAppListResponse): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // storage full or unavailable
  }
}

function getExpiredCache(): DAppListResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    return entry.data
  } catch {
    return null
  }
}

export async function fetchDAppList(): Promise<DAppListResponse> {
  const cached = getCache()
  if (cached) return cached.data

  try {
    const res = await fetch('/api/v1/dapps', {
      headers: {
        'Accept': 'application/json',
        'X-Wallet-Version': '1.0.0',
        'X-Platform': 'pwa',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: DAppListResponse = await res.json()
    setCache(data)
    return data
  } catch (err) {
    const fallback = getExpiredCache()
    if (fallback) return fallback
    throw err
  }
}

export function buildDAppUrl(dappUrl: string, mode: 'proxy' | 'sdk'): string {
  if (mode === 'proxy') {
    return `/api/v1/proxy?url=${encodeURIComponent(dappUrl)}`
  }
  const sep = dappUrl.includes('?') ? '&' : '?'
  return `${dappUrl}${sep}ring_wallet=1`
}
