import { SERVER_URL } from '../server/urls'

const API_BASE = SERVER_URL

export interface PolymarketMarket {
  id: string | number
  question: string
  slug: string
  image: string
  volume24hr: string
  volume: string
  outcomes: string
  outcomePrices: string
}

export async function fetchPolymarketMarkets(
  limit = 20,
  offset = 0
): Promise<PolymarketMarket[]> {
  const res = await fetch(`${API_BASE}/v1/prediction_markets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify({
      source: 'polymarket',
      active: true,
      closed: false,
      limit,
      offset,
      order: 'volume_24hr',
      ascending: false,
    }),
  })
  if (!res.ok) {
    throw new Error(`Prediction market API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? []
}

export async function fetchPolymarketMarketDetail(
  slug: string
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/v1/prediction_markets/detail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify({
      source: 'polymarket',
      slug,
    }),
  })
  if (!res.ok) {
    throw new Error(`Prediction market detail API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? null
}

export function formatPolymarketVolume(volumeStr: string): string {
  const num = parseFloat(volumeStr) / 1_000_000
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export function getPolymarketEventUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`
}
