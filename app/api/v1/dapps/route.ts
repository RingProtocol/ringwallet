import { NextResponse } from 'next/server'
import type { DAppListResponse } from '@/features/dapps/types/dapp'

interface RawDAppRow {
  'App name'?: string
  'DApp URL'?: string
  'App logo URL'?: string
  'App description'?: string
  Category?: string
  Top?: number | string
}

function env(key: string): string | undefined {
  return process.env[key]?.trim() || undefined
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

async function fetchRemoteDApps(testApiKey: string | null): Promise<DAppListResponse> {
  const dappUrl = env('VITE_DAPP_URL')
  const dappToken = env('DAPP_TOKEN')

  if (!dappUrl) {
    throw new Error('VITE_DAPP_URL environment variable is not set')
  }

  const url = new URL(dappUrl)
  if (dappToken) {
    url.searchParams.set('secret', dappToken)
  }
  if (testApiKey) {
    url.searchParams.set('testdapp', testApiKey)
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Remote DApp request failed with ${response.status}`)
  }

  const payload = await response.json()
  return normalizeDAppListResponse(payload)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testApiKey = searchParams.get('testdapp')
    const remotePayload = await fetchRemoteDApps(testApiKey)
    return NextResponse.json(remotePayload)
  } catch (err) {
    console.error('[API] /v1/dapps error:', (err as Error).message)
    return NextResponse.json({ error: 'Failed to fetch DApps' }, { status: 500 })
  }
}
