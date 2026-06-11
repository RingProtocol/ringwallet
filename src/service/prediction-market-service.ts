// ============================================================
// Types
// ============================================================

export enum PredictionMarketSource {
  Polymarket = 'polymarket',
}

interface ListEventsParams {
  source: PredictionMarketSource
  active?: boolean
  closed?: boolean
  limit?: number
  offset?: number
  order?: string
  ascending?: boolean
  slug?: string
  tag_id?: number
  series_id?: number
}

interface EventDetailParams {
  source: PredictionMarketSource
  slug: string
}

interface MarketTokensParams {
  source: PredictionMarketSource
  slug: string
}

interface SearchEventsParams {
  source: PredictionMarketSource
  query: string
  limit?: number
  offset?: number
}

// Raw Event from Gamma API
interface GammaEvent {
  id: string
  ticker: string
  slug: string
  title: string
  subtitle?: string
  description?: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  archived?: boolean
  volume?: number
  volume24hr?: number
  liquidity?: number
  category?: string
  subcategory?: string
  createdAt?: string
  endDate?: string
  markets?: GammaMarket[]
}

// Raw Market from Gamma API (nested inside Event)
interface GammaMarket {
  id: string | number
  question: string
  slug: string
  image?: string
  volume?: string | number
  volume24hr?: string | number
  volumeNum?: number
  liquidity?: string | number
  liquidityNum?: number
  outcomes?: string
  outcomePrices?: string
  active?: boolean
  closed?: boolean
  category?: string
  endDate?: string
  conditionId?: string
  clobTokenIds?: string
}

// Unified market shape returned to frontend
interface UnifiedMarket {
  id: string | number
  question: string
  slug: string
  image: string
  volume24hr: string
  volume: string
  outcomes: string
  outcomePrices: string
  // Event-level aggregated fields for display
  eventVolume24hr?: number
  eventVolume?: number
  eventLiquidity?: number
  category?: string
  subcategory?: string
  endDate?: string
}

// ============================================================
// Constants
// ============================================================

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// ============================================================
// Helpers
// ============================================================

function eventToUnifiedMarket(event: GammaEvent): UnifiedMarket | null {
  const markets = event.markets ?? []
  if (markets.length === 0) return null

  // Pick the first active market as the representative
  const representative = markets.find((m) => m.active !== false) ?? markets[0]

  return {
    id: representative.id,
    question: event.title || representative.question,
    slug: event.slug || representative.slug,
    image: event.image || representative.image || '',
    volume24hr: String(
      representative.volume24hr ?? representative.volumeNum ?? '0'
    ),
    volume: String(representative.volume ?? representative.volumeNum ?? '0'),
    outcomes: representative.outcomes || '[]',
    outcomePrices: representative.outcomePrices || '[]',
    // Event-level aggregated volume (much larger than single market)
    eventVolume24hr: event.volume24hr,
    eventVolume: event.volume,
    eventLiquidity: event.liquidity,
    category: event.category,
    subcategory: event.subcategory,
    endDate: event.endDate,
  }
}

function buildQueryString(
  params: Record<string, string | number | boolean>
): string {
  const pairs: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      pairs.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
    }
  }
  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}

function buildGammaQueryParams(
  params: ListEventsParams
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (params.active !== undefined) query.active = params.active
  if (params.closed !== undefined) query.closed = params.closed
  if (params.limit !== undefined) query.limit = params.limit
  if (params.offset !== undefined) query.offset = params.offset
  if (params.order) query.order = params.order
  if (params.ascending !== undefined) query.ascending = params.ascending
  if (params.slug) query.slug = params.slug
  if (params.tag_id !== undefined) query.tag_id = params.tag_id
  if (params.series_id !== undefined) query.series_id = params.series_id
  // Always include markets so we can flatten them
  query.with_markets = true
  return query
}

async function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as unknown as T
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// ============================================================
// Service functions
// ============================================================

export async function listEvents(
  params: ListEventsParams
): Promise<{ data: UnifiedMarket[] }> {
  if (params.source !== PredictionMarketSource.Polymarket) {
    throw new Error(`unsupported_prediction_market_source: ${params.source}`)
  }

  const query = buildGammaQueryParams(params)
  const url = `${GAMMA_API_BASE}/events${buildQueryString(query)}`

  const raw = await fetchJson<unknown>(url)
  const events: GammaEvent[] = Array.isArray(raw)
    ? (raw as GammaEvent[])
    : (((raw as { events?: unknown[] }).events ?? []) as GammaEvent[])

  const markets = events
    .map((ev) => eventToUnifiedMarket(ev))
    .filter((m): m is UnifiedMarket => m !== null)

  return { data: markets }
}

export async function getEventDetail(
  params: EventDetailParams
): Promise<{ data: UnifiedMarket | null }> {
  if (params.source !== PredictionMarketSource.Polymarket) {
    throw new Error(`unsupported_prediction_market_source: ${params.source}`)
  }

  const url = `${GAMMA_API_BASE}/events/${encodeURIComponent(params.slug)}${buildQueryString({ with_markets: true })}`
  const event: GammaEvent = await fetchJson<GammaEvent>(url)

  const market = eventToUnifiedMarket(event)
  return { data: market }
}

export async function getMarketTokens(
  params: MarketTokensParams
): Promise<unknown> {
  if (params.source !== PredictionMarketSource.Polymarket) {
    throw new Error(`unsupported_prediction_market_source: ${params.source}`)
  }

  // Try to get the event first, then pick the first market's tokens
  const eventUrl = `${GAMMA_API_BASE}/events/${encodeURIComponent(params.slug)}${buildQueryString({ with_markets: true })}`
  const event: GammaEvent = await fetchJson<GammaEvent>(eventUrl)
  const market = event.markets?.[0]

  if (!market) {
    throw new Error('market_not_found')
  }

  // Return token IDs if available
  return {
    data: {
      clobTokenIds: market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [],
      conditionId: market.conditionId,
    },
  }
}

export async function searchEvents(
  params: SearchEventsParams
): Promise<{ data: UnifiedMarket[] }> {
  if (params.source !== PredictionMarketSource.Polymarket) {
    throw new Error(`unsupported_prediction_market_source: ${params.source}`)
  }

  const query: Record<string, string | number | boolean> = {
    search: params.query,
    with_markets: true,
  }
  if (params.limit !== undefined) query.limit = params.limit
  if (params.offset !== undefined) query.offset = params.offset

  const url = `${GAMMA_API_BASE}/events${buildQueryString(query)}`
  const raw = await fetchJson<unknown>(url)
  const events: GammaEvent[] = Array.isArray(raw)
    ? (raw as GammaEvent[])
    : (((raw as { events?: unknown[] }).events ?? []) as GammaEvent[])

  const markets = events
    .map((ev) => eventToUnifiedMarket(ev))
    .filter((m): m is UnifiedMarket => m !== null)

  return { data: markets }
}
