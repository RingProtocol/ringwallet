const API_BASE = 'https://gamma-api.polymarket.com'

export interface PolymarketMarket {
  question: string
  slug: string
  image: string
  volume24hr: string
  volume: string
  outcomes: string
  outcomePrices: string
}

export async function fetchPolymarketMarkets(
  limit = 20
): Promise<PolymarketMarket[]> {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(limit),
    sortBy: 'volume24hr',
    sortDirection: 'desc',
  })
  const res = await fetch(`${API_BASE}/markets?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Polymarket API error: HTTP ${res.status}`)
  }
  return res.json()
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
