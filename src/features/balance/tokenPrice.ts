import type { Chain } from '../../models/ChainType'
import type { ChainTokenPrice } from '../../models/ChainTokens'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import {
  TOKEN_PRICE_BY_ADDR_URL,
  TOKEN_PRICE_BY_SYMBOL_URL,
} from '../../server/urls'

export type TokenPriceAddress = {
  network: string
  address: string
}

export type TokenPriceRequest = {
  addresses: TokenPriceAddress[]
}

export type TokenPriceSymbolRequest = {
  symbols: string[]
}

export type TokenPriceResponseItem = {
  network: string
  address: string
  prices: ChainTokenPrice[]
}

type TokenPriceResponse = {
  data: TokenPriceResponseItem[]
}

export async function fetchTokenPricesByAddr(
  addresses: TokenPriceAddress[]
): Promise<TokenPriceResponseItem[]> {
  const res = await fetch(TOKEN_PRICE_BY_ADDR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify({ addresses } satisfies TokenPriceRequest),
  })

  if (!res.ok) {
    throw new Error(`token_price failed: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as TokenPriceResponse
  return json.data ?? []
}

export async function fetchTokenPricesBySymbol(
  symbols: string[]
): Promise<TokenPriceResponseItem[]> {
  const res = await fetch(TOKEN_PRICE_BY_SYMBOL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
    },
    body: JSON.stringify({
      symbols: symbols,
    } satisfies TokenPriceSymbolRequest),
  })

  if (!res.ok) {
    throw new Error(
      `token_price_symbol failed: ${res.status} ${res.statusText}`
    )
  }

  const json = (await res.json()) as TokenPriceResponse
  return json.data ?? []
}

export function chainToTokenPriceNetwork(chain: Chain): string | undefined {
  return chainToAccountAssetsNetwork(chain)
}
