/**
 * Token storage utility for imported ERC20 tokens.
 * Storage key: imported_tokens_${chainId}_${walletAddress}
 */

import { safeGetItem, safeSetItem } from './safeStorage'

export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
}

const STORAGE_PREFIX = 'imported_tokens'

function getStorageKey(chainId: number, walletAddress: string): string {
  return `${STORAGE_PREFIX}_${chainId}_${walletAddress.toLowerCase()}`
}

export function addToken(
  walletAddress: string,
  chainId: number,
  tokenInfo: TokenInfo
): void {
  const list = getTokenList(walletAddress, chainId)
  const exists = list.some(
    (t) => t.address.toLowerCase() === tokenInfo.address.toLowerCase()
  )
  if (exists) return

  const next = [...list, tokenInfo]
  safeSetItem(getStorageKey(chainId, walletAddress), JSON.stringify(next))
}

export function getTokenList(
  walletAddress: string,
  chainId: number
): TokenInfo[] {
  try {
    const raw = safeGetItem(getStorageKey(chainId, walletAddress))
    if (!raw) return []
    return JSON.parse(raw) as TokenInfo[]
  } catch {
    return []
  }
}

export function removeToken(
  walletAddress: string,
  chainId: number,
  tokenAddress: string
): void {
  const list = getTokenList(walletAddress, chainId)
  const next = list.filter(
    (t) => t.address.toLowerCase() !== tokenAddress.toLowerCase()
  )
  safeSetItem(getStorageKey(chainId, walletAddress), JSON.stringify(next))
}
