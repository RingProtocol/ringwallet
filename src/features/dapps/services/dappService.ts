import type { DAppListResponse } from '../types/dapp'
import { resolveClientApiUrl } from '../../../utils/apiUrl'

const CACHE_KEY = 'ring_dapp_list'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  data: DAppListResponse
  timestamp: number
  is_cached: boolean
}

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return value?.trim() || undefined
}

export function getCache(): CacheEntry | null {
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
    const entry: CacheEntry = { data, timestamp: Date.now(), is_cached: true }
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
  const apikey = env('VITE_TEST_API_KEY')
  try {
    const url = resolveClientApiUrl('/api/v1/dapps')
    if (apikey) {
      url.searchParams.set('testdapp', apikey)
    }

    const res = await fetch(url.toString())

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const body = await res.text()
      throw new Error(`Expected JSON but received ${contentType || 'unknown'}: ${body.slice(0, 120)}`)
    }

    const data = await res.json() as DAppListResponse
    setCache(data)
    return data
  } catch (err) {
    console.error('dapp list error=', err)
    const fallback = getExpiredCache()
    if (fallback) return fallback
    throw err
  }
}

export function buildDAppUrl(dappUrl: string): string {
  const sep = dappUrl.includes('?') ? '&' : '?'
  return `${dappUrl}${sep}ring_wallet=1`
}
