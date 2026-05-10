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
  logo?: string | null
}

const STORAGE_PREFIX = 'imported_tokens'

function getStorageKey(
  chainId: number | string,
  walletAddress: string
): string {
  return `${STORAGE_PREFIX}_${chainId}_${walletAddress.toLowerCase()}`
}

export function addToken(
  walletAddress: string,
  chainId: number | string,
  tokenInfo: TokenInfo
): void {
  const list = getTokenList(walletAddress, chainId)
  const exists = list.some(
    (t) => t.address.toLowerCase() === tokenInfo.address.toLowerCase()
  )
  if (exists) return

  const next = [
    ...list,
    {
      ...tokenInfo,
      logo: tokenInfo.logo?.trim() || null,
    },
  ]
  safeSetItem(getStorageKey(chainId, walletAddress), JSON.stringify(next))
}

export function getTokenList(
  walletAddress: string,
  chainId: number | string
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
  chainId: number | string,
  tokenAddress: string
): void {
  const list = getTokenList(walletAddress, chainId)
  const next = list.filter(
    (t) => t.address.toLowerCase() !== tokenAddress.toLowerCase()
  )
  safeSetItem(getStorageKey(chainId, walletAddress), JSON.stringify(next))
}

export function updateTokenLogo(
  walletAddress: string,
  chainId: number | string,
  tokenAddress: string,
  logo: string
): boolean {
  const normalizedLogo = logo.trim()
  if (!normalizedLogo) return false

  const list = getTokenList(walletAddress, chainId)
  if (list.length === 0) return false

  let changed = false
  const next = list.map((token) => {
    if (token.address.toLowerCase() !== tokenAddress.toLowerCase()) {
      return token
    }

    if ((token.logo?.trim() || '') === normalizedLogo) {
      return token
    }

    changed = true
    return {
      ...token,
      logo: normalizedLogo,
    }
  })

  if (!changed) return false
  safeSetItem(getStorageKey(chainId, walletAddress), JSON.stringify(next))
  return true
}
