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
  'world cup qualifiers',
  'fifa qualifier',
  'uefa qualifiers',
  'soccer world cup',
  'international football',
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
      'fifa qualifier',
      'world cup qualifiers',
      'uefa qualifiers',
      'soccer world cup',
      'international football',
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

export interface ListMarketsOptions {
  limit?: number
  offset?: number
  category?: string
  tagId?: number
  relatedTags?: boolean
}

export async function fetchPolymarketMarkets(
  limit = 20,
  offset = 0,
  category?: string
): Promise<PolymarketMarket[]> {
  return fetchPolymarketMarketsWithOptions({ limit, offset, category })
}

export async function fetchPolymarketMarketsWithOptions(
  options: ListMarketsOptions = {}
): Promise<PolymarketMarket[]> {
  // AI CONTRACT: This is the canonical category-fetch entry point.
  // For sport/event categories, callers MUST pass { tagId, relatedTags: true }
  // instead of falling back to free-text search. See
  // documents/tech/polymarket-betting.md and the "Polymarket Category
  // Fetching Rules" section in CLAUDE.md / AGENTS.md.
  const { limit = 20, offset = 0, category, tagId, relatedTags } = options
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
  if (tagId !== undefined) {
    body.tag_id = tagId
    body.related_tags = relatedTags ?? true
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

export interface PolymarketSport {
  id?: string
  sport?: string
  tags?: string
  image?: string
  resolution?: string
  ordering?: string
  series?: string
}

export async function fetchPolymarketSports(): Promise<PolymarketSport[]> {
  const res = await fetch(`${API_BASE}/v1/prediction_markets/sports`, {
    method: 'GET',
    headers: {
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
  })
  if (!res.ok) {
    throw new Error(`Prediction market sports API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? []
}

export interface PolymarketTag {
  id?: string
  label?: string | null
  slug?: string | null
}

export async function fetchPolymarketTagBySlug(
  slug: string
): Promise<PolymarketTag | null> {
  // AI CONTRACT: This is the canonical World Cup / FIFA tag resolver.
  // Do NOT replace this with a /sports lookup — Gamma's /sports endpoint
  // does not list World Cup. See documents/tech/polymarket-betting.md.
  const res = await fetch(
    `${API_BASE}/v1/prediction_markets/tags/slug/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
      },
    }
  )
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`Prediction market tag API error: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? null
}

// Memoized world cup tag lookup so we don't refetch on every tab click.
// Resolution order:
//   1. /tags/slug/world-cup   (Gamma's authoritative World Cup tag, id=519)
//   2. /tags/slug/fifa        (broader FIFA tag, id=102183)
//   3. /sports  fallback      (does not currently contain World Cup, but kept
//                              for forward compatibility if Gamma adds a
//                              dedicated World Cup sport node)
// Each successful lookup caches the resolved id. Failure of any single step
// falls through to the next.
const WORLD_CUP_TAG_SLUGS = ['world-cup', 'fifa'] as const

let worldCupTagIdPromise: Promise<number | null> | null = null

function parseTagId(raw: string | undefined): number | null {
  if (!raw) return null
  const num = Number.parseInt(raw.trim(), 10)
  return Number.isFinite(num) ? num : null
}

export async function getWorldCupTagId(): Promise<number | null> {
  if (!worldCupTagIdPromise) {
    worldCupTagIdPromise = (async () => {
      for (const slug of WORLD_CUP_TAG_SLUGS) {
        try {
          const tag = await fetchPolymarketTagBySlug(slug)
          const id = parseTagId(tag?.id)
          if (id !== null) {
            return id
          }
        } catch {
          // network error, try next slug
        }
      }
      // Last-resort: scan /sports for any entry whose `tags` CSV begins
      // with a positive integer. As of writing, /sports has no World Cup
      // node, so this returns null in practice.
      try {
        const sports = await fetchPolymarketSports()
        for (const sport of sports) {
          const id = parseTagId(sport.id) ?? parseTagId(sport.tags)
          if (id !== null) return id
        }
      } catch {
        // ignore — caller will fall back to the keyword search pool
      }
      return null
    })()
  }
  return worldCupTagIdPromise
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
  // AI CONTRACT: World Cup is a tag-based category. Do not revert this to
  // free-text search alone — see documents/tech/polymarket-betting.md.
  const tagId = await getWorldCupTagId()
  if (tagId === null) {
    // No tag id available — fall back to the keyword search pool.
    return fetchPolymarketWorldCupMarketsBySearch(limit, offset)
  }
  const data = await fetchPolymarketMarketsWithOptions({
    limit,
    offset,
    tagId,
    relatedTags: true,
  })
  // When the page is small on first page, fall back to keyword search to
  // cover edge cases where the tag taxonomy missed a market.
  if (offset === 0 && data.length === 0) {
    return fetchPolymarketWorldCupMarketsBySearch(limit, offset)
  }
  return {
    data,
    hasMore: data.length === limit,
  }
}

async function fetchPolymarketWorldCupMarketsBySearch(
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
  // AI CONTRACT: Gamma's volume values are already scaled. Do NOT add a
  // `parseFloat(volumeStr) / 1_000_000` step here. See
  // documents/tech/polymarket-betting.md and the volume unit findings in
  // wallet-api/README.md.
  const num = parseFloat(volumeStr)
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export function getPolymarketEventUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`
}
