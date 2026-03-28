import type { DAppListResponse } from '../types/dapp'

const CACHE_KEY = 'ring_dapp_list'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  data: DAppListResponse
  timestamp: number
  is_cached: boolean
}

interface RawDAppRow {
  'App name'?: string
  'DApp URL'?: string
  'App logo URL'?: string
  'App description'?: string
  Category?: string
  Top?: number | string
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

function parseTop(value: unknown): number {
  const normalized = cleanField(value)
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function getCategoryName(value: unknown): string {
  const category = cleanField(value)
  return category || 'General'
}

function getCategoryId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general'
}

function isDAppListResponse(data: unknown): data is DAppListResponse {
  if (!data || typeof data !== 'object') return false
  const value = data as Partial<DAppListResponse>
  return Array.isArray(value.dapps) && Array.isArray(value.categories) && typeof value.updated_at === 'string'
}

function transformRawDAppRows(rows: RawDAppRow[]): DAppListResponse {
  const categoryMap = new Map<string, string>()

  const dapps = rows.map((row, index) => {
    const categoryName = getCategoryName(row.Category)
    const categoryId = getCategoryId(categoryName)
    categoryMap.set(categoryId, categoryName)

    return {
      id: index + 1,
      name: cleanField(row['App name']) || `DApp ${index + 1}`,
      description: cleanField(row['App description']),
      url: cleanField(row['DApp URL']),
      icon: cleanField(row['App logo URL']),
      chains: [],
      category: categoryId,
      top: parseTop(row.Top),
    }
  })

  const categories = Array.from(categoryMap.entries()).map(([id, name], index) => ({
    id,
    name,
    icon: '',
    sort_order: index,
  }))

  return {
    dapps,
    categories,
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
  const apikey = getTestDappApiKey()
  try {
    const url = new URL('/api/v1/dapps', window.location.origin)
    if (apikey) {
      url.searchParams.set('testdapp', apikey)
    }

    const res = await fetch(url.toString())
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
