import { ensureTestEnv, tryGetAlchemyApiKey } from '../../../lib/env'

/**
 * When `TEST_SOLANA_RPC_URL` is unset, builds Alchemy Solana URL from the same key as EVM fork:
 * `ALCHEMY_API_KEY` or `VITE_ALCHEMY_RPC_KEY` in `.env.test`.
 *
 * `TEST_SOLANA_ALCHEMY_CLUSTER`: `devnet` (default) | `mainnet` | `mainnet-beta`
 */
export function resolveSolanaTestRpcUrl(): string {
  ensureTestEnv()
  const explicit = process.env.TEST_SOLANA_RPC_URL?.trim()
  if (explicit) return explicit
  const k = tryGetAlchemyApiKey()
  if (k) {
    const cluster = (
      process.env.TEST_SOLANA_ALCHEMY_CLUSTER || 'devnet'
    ).toLowerCase()
    if (cluster === 'mainnet' || cluster === 'mainnet-beta') {
      return `https://solana-mainnet.g.alchemy.com/v2/${k}`
    }
    return `https://solana-devnet.g.alchemy.com/v2/${k}`
  }
  return 'https://api.mainnet-beta.solana.com'
}

/**
 * When `TEST_TRON_API_URL` is unset, uses Alchemy TRON mainnet base:
 * `https://tron-mainnet.g.alchemy.com/v2/<key>` (JSON-RPC e.g. `eth_blockNumber`).
 * Without a key, falls back to public Shasta TronGrid (`/wallet/getnowblock`).
 */
export function resolveTronTestHttpBase(): string {
  ensureTestEnv()
  const explicit = process.env.TEST_TRON_API_URL?.trim()
  if (explicit) return explicit
  const k = tryGetAlchemyApiKey()
  if (k) return `https://tron-mainnet.g.alchemy.com/v2/${k}`
  return 'https://api.shasta.trongrid.io'
}

export function isTronAlchemyMainnetBase(base: string): boolean {
  return base.includes('tron-mainnet.g.alchemy.com')
}

/**
 * Alchemy Tron exposes Ethereum-style JSON-RPC at the same `/v2/<key>` URL (e.g. `eth_blockNumber`).
 * TronGrid-style hosts use `POST /wallet/getnowblock` with `{}`.
 */
export async function fetchTronChainProbe(base: string): Promise<Response> {
  const signal = AbortSignal.timeout(30_000)
  if (isTronAlchemyMainnetBase(base)) {
    return fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
      signal,
    })
  }
  return fetch(`${base.replace(/\/$/, '')}/wallet/getnowblock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal,
  })
}

export type BitcoinTipProbe =
  | { kind: 'esplora'; baseUrl: string }
  | { kind: 'alchemy-bitcoin-jsonrpc'; rpcUrl: string }

const ESPLORA_PUBLIC_TESTNET = 'https://blockstream.info/testnet/api'
const ESPLORA_PUBLIC_MAINNET = 'https://blockstream.info/api'

/**
 * Tip probe: explicit Esplora base, else Alchemy Bitcoin JSON-RPC URL when an API key exists, else public Esplora testnet.
 *
 * `fetchBitcoinTipHeight` retries Alchemy then falls back to public Blockstream Esplora if Alchemy is unreachable
 * (e.g. key without Bitcoin product, or transient network errors).
 *
 * `TEST_BITCOIN_ALCHEMY_NETWORK`: `testnet` (default) | `mainnet`
 */
export function resolveBitcoinTipProbe(): BitcoinTipProbe {
  ensureTestEnv()
  const explicit = process.env.TEST_BITCOIN_INDEXER_URL?.trim()
  if (explicit) return { kind: 'esplora', baseUrl: explicit }
  const k = tryGetAlchemyApiKey()
  if (k) {
    const net = (
      process.env.TEST_BITCOIN_ALCHEMY_NETWORK || 'testnet'
    ).toLowerCase()
    if (net === 'mainnet') {
      return {
        kind: 'alchemy-bitcoin-jsonrpc',
        rpcUrl: `https://bitcoin-mainnet.g.alchemy.com/v2/${k}`,
      }
    }
    return {
      kind: 'alchemy-bitcoin-jsonrpc',
      rpcUrl: `https://bitcoin-testnet.g.alchemy.com/v2/${k}`,
    }
  }
  return { kind: 'esplora', baseUrl: ESPLORA_PUBLIC_TESTNET }
}

async function fetchEsploraTipHeight(baseUrl: string): Promise<number> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/blocks/tip/height`, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`Esplora tip height: HTTP ${res.status} (${baseUrl})`)
  }
  return Number.parseInt(await res.text(), 10)
}

async function fetchAlchemyBitcoinBlockCount(rpcUrl: string): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getblockcount',
      params: [],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`Alchemy Bitcoin getblockcount: HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    result?: number
    error?: { message?: string }
  }
  if (json.error?.message) {
    throw new Error(json.error.message)
  }
  if (typeof json.result !== 'number') {
    throw new Error('getblockcount: missing numeric result')
  }
  return json.result
}

export async function fetchBitcoinTipHeight(
  probe: BitcoinTipProbe
): Promise<number> {
  if (probe.kind === 'esplora') {
    return fetchEsploraTipHeight(probe.baseUrl)
  }

  const esploraFallback = probe.rpcUrl.includes('bitcoin-mainnet')
    ? ESPLORA_PUBLIC_MAINNET
    : ESPLORA_PUBLIC_TESTNET

  let last: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fetchAlchemyBitcoinBlockCount(probe.rpcUrl)
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }

  try {
    return await fetchEsploraTipHeight(esploraFallback)
  } catch (fallbackErr) {
    const a = last instanceof Error ? last.message : String(last)
    const b =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
    throw new Error(
      `Alchemy Bitcoin (${probe.rpcUrl}) failed after retries (${a}); Esplora fallback (${esploraFallback}) failed (${b})`,
      { cause: fallbackErr }
    )
  }
}
