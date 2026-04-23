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

const TOKEN_PRICE_HISTORICAL_URL =
  'https://rw.testring.org/v1/token_price_historical'

export async function fetchTokenPriceHistorical(
  params: TokenPriceHistoricalRequest,
  signal?: AbortSignal
): Promise<PriceDataPoint[]> {
  const res = await fetch(TOKEN_PRICE_HISTORICAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key':
        'wallet_s32909jfie829384jjsjnfkdnwh22338dhshwbsnw1j2b3h3j4h8d7',
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
