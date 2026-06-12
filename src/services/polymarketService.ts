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
  // Event-level aggregated fields (from Events API)
  eventVolume24hr?: number
  eventVolume?: number
  eventLiquidity?: number
  category?: string
  subcategory?: string
}

export type MarketCategory =
  | 'hot'
  | 'worldCup'
  | 'sports'
  | 'politics'
  | 'crypto'
  | 'world'
  | 'entertainment'
  | 'science'

export interface CategoryTab {
  key: MarketCategory
  labelKey: string
  keywords: string[]
  serverCategory?: string
}

const WORLD_CUP_SEARCH_TERMS = [
  'world cup',
  'fifa world cup',
  'wcq',
  'world cup qualifier',
]

export const CATEGORY_TABS: CategoryTab[] = [
  { key: 'hot', labelKey: 'predictTabHot', keywords: [] },
  {
    key: 'worldCup',
    labelKey: 'predictTabWorldCup',
    keywords: [
      'world cup',
      'fifa world cup',
      'fifa',
      '世界杯',
      'wcq',
      'qualifier',
      'qualifiers',
      'uefa',
      'concacaf',
      'conmebol',
      'afc',
      'caf',
      'worldcup',
    ],
  },
  {
    key: 'sports',
    labelKey: 'predictTabSports',
    serverCategory: 'sports',
    keywords: [
      'sports',
      'nba',
      'nfl',
      'soccer',
      'football',
      'olympic',
      'match',
      'team',
      'player',
      'champion',
      'tournament',
      'super bowl',
      'world cup',
      'premier league',
      'mlb',
      'nhl',
      'tennis',
      'golf',
      'cricket',
      'rugby',
      'f1',
      'racing',
      'esports',
      'ufc',
      'mma',
      'boxing',
      'basketball',
      'baseball',
      'hockey',
      'formula 1',
    ],
  },
  {
    key: 'crypto',
    labelKey: 'predictTabCrypto',
    serverCategory: 'crypto',
    keywords: [
      'crypto',
      'bitcoin',
      'ethereum',
      'btc',
      'eth',
      'blockchain',
      'token',
      'nft',
      'defi',
      'solana',
      'cardano',
      'xrp',
      'cryptocurrency',
      'altcoin',
      'mining',
      'halving',
      'dex',
      'cex',
      'binance',
      'coinbase',
      'etf',
    ],
  },
  {
    key: 'politics',
    labelKey: 'predictTabPolitics',
    serverCategory: 'politics',
    keywords: [
      'politic',
      'election',
      'president',
      'congress',
      'senate',
      'vote',
      'trump',
      'biden',
      'government',
      'parliament',
      'campaign',
      'governor',
      'mayor',
      'referendum',
      'ballot',
      'democrat',
      'republican',
      'conservative',
      'labour',
      'liberal',
      'midterm',
      'primary',
      'nomination',
      'impeach',
    ],
  },
  {
    key: 'world',
    labelKey: 'predictTabWorld',
    serverCategory: 'world',
    keywords: [
      'war',
      'military',
      'conflict',
      'ukraine',
      'gaza',
      'israel',
      'russia',
      'invasion',
      'attack',
      'defense',
      'nato',
      'missile',
      'drone',
      'army',
      'troop',
      'ceasefire',
      'peace',
      'iran',
      'north korea',
      'taiwan',
      'terror',
      'sanction',
      'diplomat',
      'embassy',
      'border',
    ],
  },
  {
    key: 'entertainment',
    labelKey: 'predictTabEntertainment',
    serverCategory: 'entertainment',
    keywords: [
      'movie',
      'film',
      'music',
      'oscar',
      'grammy',
      'emmy',
      'celebrity',
      'actor',
      'album',
      'song',
      'entertainment',
      'hollywood',
      'box office',
      'streaming',
      'netflix',
      'disney',
      'marvel',
      'tv show',
      'series',
      'concert',
      'festival',
      'game of thrones',
      'kardashian',
    ],
  },
  {
    key: 'science',
    labelKey: 'predictTabScience',
    serverCategory: 'science',
    keywords: [
      'science',
      'space',
      'nasa',
      'mars',
      'ai',
      'artificial intelligence',
      'climate',
      'weather',
      'temperature',
      'vaccine',
      'medicine',
      'physics',
      'biology',
      'chemistry',
      'spacex',
      'rocket',
      'satellite',
      'eclipse',
      'pandemic',
      'covid',
      'virus',
      'fda',
      'approval drug',
    ],
  },
]

export function marketMatchesCategory(
  market: PolymarketMarket,
  category: MarketCategory
): boolean {
  if (category === 'hot') return true
  const text = `${market.question} ${market.slug}`.toLowerCase()
  const tab = CATEGORY_TABS.find((t) => t.key === category)
  if (!tab) return false
  return tab.keywords.some((kw) => text.includes(kw.toLowerCase()))
}

export function filterMarketsByCategory(
  markets: PolymarketMarket[],
  category: MarketCategory
): PolymarketMarket[] {
  if (category === 'hot') return markets
  return markets.filter((m) => marketMatchesCategory(m, category))
}

export function getServerCategoryForTab(
  category: MarketCategory
): string | undefined {
  return CATEGORY_TABS.find((tab) => tab.key === category)?.serverCategory
}

function getMarketTotalVolume(market: PolymarketMarket): number {
  const raw =
    market.eventVolume !== undefined
      ? String(market.eventVolume)
      : market.volume
  return Number.parseFloat(raw) || 0
}

function dedupeMarketsBySlug(markets: PolymarketMarket[]): PolymarketMarket[] {
  const deduped = new Map<string, PolymarketMarket>()
  for (const market of markets) {
    const existing = deduped.get(market.slug)
    if (
      !existing ||
      getMarketTotalVolume(market) > getMarketTotalVolume(existing)
    ) {
      deduped.set(market.slug, market)
    }
  }
  return [...deduped.values()]
}

function sortMarketsByTotalVolume(
  markets: PolymarketMarket[]
): PolymarketMarket[] {
  return [...markets].sort(
    (left, right) => getMarketTotalVolume(right) - getMarketTotalVolume(left)
  )
}

export async function fetchPolymarketMarkets(
  limit = 20,
  offset = 0,
  category?: string
): Promise<PolymarketMarket[]> {
  const body: Record<string, unknown> = {
    source: 'polymarket',
    active: true,
    closed: false,
    limit,
    offset,
    order: 'volume_total',
    ascending: false,
  }
  if (category) {
    body.category = category
  }
  const res = await fetch(`${API_BASE}/v1/prediction_markets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Prediction market API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? []
}

export async function fetchPolymarketSearchMarkets(
  query: string,
  limit = 20,
  offset = 0
): Promise<PolymarketMarket[]> {
  const res = await fetch(`${API_BASE}/v1/prediction_markets/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify({
      source: 'polymarket',
      query,
      limit,
      offset,
    }),
  })
  if (!res.ok) {
    throw new Error(`Prediction market search API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? []
}

export async function fetchPolymarketWorldCupMarkets(
  limit = 20,
  offset = 0
): Promise<{ data: PolymarketMarket[]; hasMore: boolean }> {
  const poolTarget = Math.min(Math.max((offset + limit) * 4, 60), 120)
  const perQueryLimit = Math.max(
    Math.ceil(poolTarget / WORLD_CUP_SEARCH_TERMS.length),
    20
  )

  const results = await Promise.all(
    WORLD_CUP_SEARCH_TERMS.map((query) =>
      fetchPolymarketSearchMarkets(query, perQueryLimit, 0)
    )
  )

  const merged = dedupeMarketsBySlug(results.flat())
  const filtered = merged.filter((market) =>
    marketMatchesCategory(market, 'worldCup')
  )
  const sorted = sortMarketsByTotalVolume(filtered)
  const page = sorted.slice(offset, offset + limit)

  return {
    data: page,
    hasMore: offset + limit < sorted.length,
  }
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
