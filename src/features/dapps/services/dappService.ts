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

function env(key: string): string | undefined {
  const val = (import.meta.env as Record<string, string | undefined>)[key]
  return val?.trim() || undefined
}

function getTestDappKey(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('testdapp')
}

export async function fetchDAppList(): Promise<DAppListResponse> {
  const testKey = getTestDappKey()
  const dappUrl = env('VITE_DAPP_URL')
  const dappKey = env('VITE_DAPP_KEY')

  if (!testKey) {
    const cached = getCache()
    if (cached) return cached.data
  }

  try {
    let url: string
    if (testKey && dappUrl) {
      url = `${dappUrl}?testdapp=${encodeURIComponent(testKey)}`
    } else if (dappUrl && dappKey) {
      url = `${dappUrl}?secret=${encodeURIComponent(dappKey)}`
    } else {
      throw new Error('DAPP_URL or DAPP_KEY is not configured')
    }

    const res = await fetch(url, {
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

export function buildDAppUrl(dappUrl: string): string {
  const sep = dappUrl.includes('?') ? '&' : '?'
  return `${dappUrl}${sep}ring_wallet=1`
}
