import { ethers } from 'ethers'
import {
  POLYMARKET_CLOB_API,
  CTF_EXCHANGE_V1_DOMAIN,
  CTF_ORDER_TYPES_V1,
  POLYMARKET_DECIMALS,
} from './constants'

// ── Types ──────────────────────────────────────────────────────

export interface ClobApiCredentials {
  apiKey: string
  secret: string
  passphrase: string
}

export interface CtfOrder {
  salt: string
  maker: string
  signer: string
  taker: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  expiration: string
  nonce: string
  feeRateBps: string
  side: number // 0 = BUY, 1 = SELL
  signatureType: number // 0 = EOA
  signature: string
}

export interface OrderArgs {
  tokenId: string
  price: number // e.g. 0.55
  size: number // USDC amount
  side: 'BUY' | 'SELL'
  tickSize: string // e.g. "0.001"
}

// ── HMAC auth helpers ──────────────────────────────────────────

export function hmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string
): string {
  const message = `${timestamp}${method}${requestPath}`
  const key = ethers.toUtf8Bytes(secret)
  const msg = ethers.toUtf8Bytes(message)
  return ethers.computeHmac('sha256', key, msg)
}

export async function clobRequest<T>(
  path: string,
  creds: ClobApiCredentials,
  opts?: { method?: string; body?: unknown }
): Promise<T> {
  const method = opts?.method ?? 'GET'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const sig = hmacSignature(creds.secret, timestamp, method, path)

  const headers: Record<string, string> = {
    'POLYMARKET-API-KEY': creds.apiKey,
    'POLYMARKET-SIGNATURE': sig,
    'POLYMARKET-TIMESTAMP': timestamp,
    'POLYMARKET-PASSPHRASE': creds.passphrase,
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${POLYMARKET_CLOB_API}${path}`, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CLOB API error: HTTP ${res.status} ${text}`)
  }
  return res.json() as T
}

// ── API key derivation ─────────────────────────────────────────

/**
 * Derive or create CLOB API credentials.
 * The user signs a specific nonce message; the signature is used
 * to derive the API key, secret and passphrase on the server side.
 */
export async function deriveApiKey(
  signer: ethers.Signer
): Promise<ClobApiCredentials> {
  const address = await signer.getAddress()
  // Nonce endpoint returns the message to sign
  const nonceRes = await fetch(
    `${POLYMARKET_CLOB_API}/auth/nonce?address=${address.toLowerCase()}`
  )
  if (!nonceRes.ok) {
    throw new Error(`Failed to fetch nonce: HTTP ${nonceRes.status}`)
  }
  const { nonce } = (await nonceRes.json()) as { nonce: string }
  const signature = await signer.signMessage(nonce)

  const res = await fetch(`${POLYMARKET_CLOB_API}/auth/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: address.toLowerCase(),
      signature,
      nonce,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API key derivation failed: HTTP ${res.status} ${text}`)
  }
  return (await res.json()) as ClobApiCredentials
}

// ── Order building ─────────────────────────────────────────────

export function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function buildCtfOrder(
  args: OrderArgs,
  makerAddress: string,
  signerAddress: string
): Omit<CtfOrder, 'signature'> {
  const { tokenId, price, size, side, tickSize } = args
  const rounding = getTickRounding(tickSize)

  const roundedPrice = roundToDecimals(price, rounding.price)
  const roundedSize = roundToDecimals(size, rounding.size)

  // makerAmount = USDC side (6 decimals)
  // takerAmount = outcome token side (6 decimals)
  const makerAmount = ethers.parseUnits(
    roundedSize.toFixed(6),
    POLYMARKET_DECIMALS
  )
  const takerAmount = ethers.parseUnits(
    (roundedSize / roundedPrice).toFixed(6),
    POLYMARKET_DECIMALS
  )

  const salt = ethers.hexlify(ethers.randomBytes(32))
  const expiration = Math.floor(Date.now() / 1000) + 3600 // 1 hour
  const nonce = '0' // simplified; real impl may track on-chain nonce
  const feeRateBps = '0' // fee handled by exchange

  return {
    salt,
    maker: makerAddress,
    signer: signerAddress,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration: expiration.toString(),
    nonce,
    feeRateBps,
    side: side === 'BUY' ? 0 : 1,
    signatureType: 0,
  }
}

export function getTickRounding(tickSize: string): {
  price: number
  size: number
} {
  switch (tickSize) {
    case '0.1':
      return { price: 1, size: 2 }
    case '0.01':
      return { price: 2, size: 2 }
    case '0.001':
      return { price: 3, size: 2 }
    case '0.0001':
      return { price: 4, size: 2 }
    default:
      return { price: 2, size: 2 }
  }
}

// ── EIP-712 signing ────────────────────────────────────────────

export async function signCtfOrder(
  signer: ethers.Signer,
  order: Omit<CtfOrder, 'signature'>
): Promise<string> {
  const signature = await signer.signTypedData(
    CTF_EXCHANGE_V1_DOMAIN,
    CTF_ORDER_TYPES_V1,
    order
  )
  return signature
}

// ── Order submission ───────────────────────────────────────────

export async function postOrder(
  order: CtfOrder,
  creds: ClobApiCredentials
): Promise<unknown> {
  return clobRequest('/order', creds, {
    method: 'POST',
    body: order,
  })
}

// ── Market metadata (Gamma API) ────────────────────────────────

export interface MarketToken {
  tokenId: string
  outcome: string
  outcomeIndex: number
  price: string
}

export async function fetchMarketTokens(slug: string): Promise<MarketToken[]> {
  const res = await fetch(
    `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`
  )
  if (!res.ok) {
    throw new Error(`Gamma API error: HTTP ${res.status}`)
  }
  const data = (await res.json()) as Array<{
    tokens: Array<{
      token_id: string
      outcome: string
      price: number
      winner: boolean
    }>
  }>
  if (!data || data.length === 0) {
    throw new Error('Market not found in Gamma API')
  }
  return data[0].tokens.map((t, idx) => ({
    tokenId: t.token_id,
    outcome: t.outcome,
    outcomeIndex: idx,
    price: t.price.toString(),
  }))
}
