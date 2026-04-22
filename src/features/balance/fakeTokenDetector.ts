import type { ChainToken } from '../../models/ChainTokens'

const POPULAR_TOKEN_PATTERNS = [
  { symbol: 'usdt', names: ['tether', 'usdt'] },
  { symbol: 'eth', names: ['ethereum', 'eth', 'ether'] },
  { symbol: 'btc', names: ['bitcoin', 'btc'] },
  { symbol: 'usdc', names: ['usd coin', 'usdc'] },
  { symbol: 'bnb', names: ['bnb', 'binance coin'] },
  { symbol: 'sol', names: ['solana', 'sol'] },
  { symbol: 'dai', names: ['dai'] },
  { symbol: 'weth', names: ['wrapped ether', 'weth', 'wrapped eth'] },
  { symbol: 'matic', names: ['polygon', 'matic'] },
  { symbol: 'trx', names: ['tron', 'trx'] },
  { symbol: 'doge', names: ['dogecoin', 'doge'] },
]

function normalize(text: string | null | undefined): string {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function usdUnitPrice(token: ChainToken): number | null {
  const p = token.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
  if (!p) return null
  const n = Number(p.value)
  if (!Number.isFinite(n)) return null
  return n
}

/** 简易 Levenshtein 距离（支持短词拼写变异，如 USDTT / USDDT） */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  )
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

/** symbol / name 是否碰瓷知名代币 */
function resemblesPopularToken(token: ChainToken): boolean {
  const sym = normalize(token.tokenMetadata?.symbol)
  const name = normalize(token.tokenMetadata?.name)

  if (!sym && !name) return false

  for (const p of POPULAR_TOKEN_PATTERNS) {
    const patSym = p.symbol
    const patNames = p.names.map(normalize)

    // 1) 子串包含（如 "USDT Token", "Wrapped USDT"）
    if (sym === patSym || patSym === sym) return true
    if (sym.includes(patSym) || patSym.includes(sym)) return true
    for (const pn of patNames) {
      if (name === pn || name.includes(pn) || pn.includes(name)) return true
    }

    // 2) 拼写距离（容忍 1~2 个字符错误）
    if (sym.length >= 2 && sym.length <= 6) {
      if (levenshtein(sym, patSym) <= 1) return true
    } else if (sym.length > 6) {
      if (levenshtein(sym, patSym) <= 2) return true
    }
  }
  return false
}

/** 是否为可疑假币：价格为 0 且名字碰瓷 */
export function isSuspiciousFakeToken(token: ChainToken): boolean {
  const price = usdUnitPrice(token)
  return price === 0 && resemblesPopularToken(token)
}

/** 将 token 列表二分为主列表 + 隐藏列表 */
export function partitionTokens(tokens: ChainToken[]): {
  visible: ChainToken[]
  hidden: ChainToken[]
} {
  const visible: ChainToken[] = []
  const hidden: ChainToken[] = []
  for (const t of tokens) {
    if (isSuspiciousFakeToken(t)) {
      hidden.push(t)
    } else {
      visible.push(t)
    }
  }
  return { visible, hidden }
}
