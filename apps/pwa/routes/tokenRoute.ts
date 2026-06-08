import type { ChainToken } from '@/models/ChainTokens'

export const NATIVE_TOKEN_ROUTE_ID = '__native__'

export function getTokenRouteId(
  token: Pick<ChainToken, 'tokenAddress'>
): string {
  return token.tokenAddress?.toLowerCase() ?? NATIVE_TOKEN_ROUTE_ID
}

export function buildTokenDetailPath(
  chainId: string | number,
  token: Pick<ChainToken, 'tokenAddress'>
): string {
  return `/token/${encodeURIComponent(String(chainId))}/${encodeURIComponent(getTokenRouteId(token))}`
}
