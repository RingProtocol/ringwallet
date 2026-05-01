import { TOKEN_PRICE_HISTORICAL_URL } from '../../server/urls'

export interface PriceDataPoint {
  value: string
  timestamp: string
}

export type TokenPriceHistoricalRequest =
  | {
      network: string
      address: string
      startTime: string
      endTime: string
      interval: string
    }
  | {
      symbol: string
      startTime: string
      endTime: string
      interval: string
    }

export interface TokenPriceHistoricalResponse {
  network?: string
  address?: string
  symbol?: string
  currency: string
  data: PriceDataPoint[]
}

export async function fetchTokenPriceHistorical(
  params: TokenPriceHistoricalRequest,
  signal?: AbortSignal
): Promise<PriceDataPoint[]> {
  const res = await fetch(TOKEN_PRICE_HISTORICAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify(params),
    signal,
  })

  if (!res.ok) {
    throw new Error(
      `token_price_historical failed: ${res.status} ${res.statusText}`
    )
  }

  const json = (await res.json()) as TokenPriceHistoricalResponse
  return json.data ?? []
}
