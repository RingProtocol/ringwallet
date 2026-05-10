import type { ChainToken } from '../../models/ChainTokens'

function usdUnitPrice(token: ChainToken): number | null {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  if (!p) return null
  const n = Number(p.value)
  if (!Number.isFinite(n)) return null
  return n
}

/** 是否应归入隐藏列表：无价格或价格为 0 */
export function isSuspiciousFakeToken(token: ChainToken): boolean {
  const price = usdUnitPrice(token)
  return price === null || price === 0
}

/** 将 token 列表二分为主列表 + 隐藏列表 */
export function partitionTokens(tokens: ChainToken[]): {
  visible: ChainToken[]
  hidden: ChainToken[]
} {
  const visible: ChainToken[] = []
  const hidden: ChainToken[] = []
  // 如果列表只有唯一的 native token，不应放入 hidden（即使价格为 null）
  const onlyNative = tokens.length === 1 && tokens[0].tokenAddress == null

  for (const t of tokens) {
    if (isSuspiciousFakeToken(t) && !onlyNative) {
      hidden.push(t)
    } else {
      visible.push(t)
    }
  }
  return { visible, hidden }
}
