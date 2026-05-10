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

export type MarketCategory =
  | 'all'
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
}

export const CATEGORY_TABS: CategoryTab[] = [
  { key: 'all', labelKey: 'predictTabAll', keywords: [] },
  {
    key: 'sports',
    labelKey: 'predictTabSports',
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
    key: 'politics',
    labelKey: 'predictTabPolitics',
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
    key: 'crypto',
    labelKey: 'predictTabCrypto',
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
    key: 'world',
    labelKey: 'predictTabWorld',
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
  if (category === 'all') return true
  const text = `${market.question} ${market.slug}`.toLowerCase()
  const tab = CATEGORY_TABS.find((t) => t.key === category)
  if (!tab) return false
  return tab.keywords.some((kw) => text.includes(kw.toLowerCase()))
}

export function filterMarketsByCategory(
  markets: PolymarketMarket[],
  category: MarketCategory
): PolymarketMarket[] {
  if (category === 'all') return markets
  return markets.filter((m) => marketMatchesCategory(m, category))
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
    order: 'volume_24hr',
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
