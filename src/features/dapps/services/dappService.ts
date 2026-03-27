import type { DAppListResponse } from '../types/dapp'

const CACHE_KEY = 'ring_dapp_list'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  data: DAppListResponse
  timestamp: number
}

interface RawDAppRow {
  'App name'?: string
  'DApp URL'?: string
  'App logo URL'?: string
  'App description'?: string
  ApiKey?: number | string
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

function getTestDappApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('apikey')
}

function cleanField(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^[`'"\s]+|[`'"\s]+$/g, '')
    .trim()
}

function isDAppListResponse(data: unknown): data is DAppListResponse {
  if (!data || typeof data !== 'object') return false
  const value = data as Partial<DAppListResponse>
  return Array.isArray(value.dapps) && Array.isArray(value.categories) && typeof value.updated_at === 'string'
}

function transformRawDAppRows(rows: RawDAppRow[]): DAppListResponse {
  const dapps = rows.map((row, index) => ({
    id: index + 1,
    name: cleanField(row['App name']) || `DApp ${index + 1}`,
    description: cleanField(row['App description']),
    url: cleanField(row['DApp URL']),
    icon: cleanField(row['App logo URL']),
    chains: [],
    category: 'general',
    featured: index === 0,
    status: 'active' as const,
    apikey: cleanField(row.ApiKey),
  }))

  return {
    dapps,
    categories: [
      {
        id: 'general',
        name: 'General',
        icon: '',
        sort_order: 0,
      },
    ],
    updated_at: new Date().toISOString(),
  }
}

function normalizeDAppListResponse(data: unknown): DAppListResponse {
  if (isDAppListResponse(data)) return data
  if (Array.isArray(data)) {
    return transformRawDAppRows(data as RawDAppRow[])
  }
  throw new Error('Invalid DApp list response format')
}

export async function fetchDAppList(): Promise<DAppListResponse> {
  const cached = getCache()
  if (cached) return cached.data

  const apikey = env('VITE_TEST_API_KEY') || getTestDappApiKey()
  const dappUrl = env('VITE_DAPP_URL')
  const dappToken = env('VITE_DAPP_TOKEN')
  console.log("dappUrl:", dappUrl)
  console.log("dappToken:", dappToken)
  if (!dappUrl) {
    throw new Error('DAPP_URL is not configured')
  }
  console.log("apikey:", apikey)
  try {
    let url: string = dappUrl
    if (apikey && dappToken) {
      url = `${dappUrl}?testdapp=${encodeURIComponent(apikey)}&secret=${encodeURIComponent(dappToken)}`
    } else if (dappToken) {
      url = `${dappUrl}?secret=${encodeURIComponent(dappToken)}`
    } else if (apikey) {
      url = `${dappUrl}?testdapp=${encodeURIComponent(apikey)}`
    }
    console.log("Fetching DApp list from " + url);

    const res = await fetch(url, {
      // headers: {
      //   'Accept': 'application/json',
      //   'X-Wallet-Version': '1.0.0',
      //   'X-Platform': 'pwa',
      // },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    const data = normalizeDAppListResponse(raw)
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
