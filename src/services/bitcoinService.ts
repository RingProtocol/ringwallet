import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import type { Chain } from '../models/ChainType'
import { BitcoinKeyService } from './chainplugins/bitcoin/bitcoinPlugin'

bitcoin.initEccLib(ecc)

export type BitcoinFork = 'mainnet' | 'testnet3' | 'testnet4'

/** Resolve fork from chain config (see `Chain.bitcoinFork` in `ChainType.ts`). */
export function bitcoinForkForChain(
  chain: Pick<Chain, 'id' | 'network' | 'bitcoinFork'>
): BitcoinFork {
  if (chain.bitcoinFork) return chain.bitcoinFork
  if (chain.network === 'mainnet') return 'mainnet'
  if (chain.id === 'bitcoin-testnet3') return 'testnet3'
  if (chain.network === 'testnet') return 'testnet4'
  return 'mainnet'
}

/** When only `rpcUrl` is available (e.g. plugin broadcast). */
export function inferBitcoinForkFromRpcUrl(rpcUrl: string): BitcoinFork {
  const u = rpcUrl.toLowerCase()
  if (u.includes('testnet4') || u.includes('/testnet4')) return 'testnet4'
  if (
    u.includes('blockstream.info/testnet') ||
    u.includes('mempool.space/testnet/api') ||
    (u.includes('bitcoin-testnet') && !u.includes('testnet4'))
  ) {
    return 'testnet3'
  }
  if (u.includes('testnet')) return 'testnet4'
  return 'mainnet'
}

const SATS_PER_BTC = 100_000_000
const DUST_THRESHOLD = 546

export interface Utxo {
  txid: string
  vout: number
  value: number
  status: {
    confirmed: boolean
    block_height?: number
  }
}

export interface FeeEstimates {
  [blocks: string]: number
}

type BitcoinApiKind = 'esplora' | 'alchemy'

interface BitcoinApiEndpoint {
  base: string
  kind: BitcoinApiKind
}

interface EsploraAddressStats {
  funded_txo_sum: number
  spent_txo_sum: number
}

interface EsploraAddressResponse {
  chain_stats: EsploraAddressStats
  mempool_stats: EsploraAddressStats
}

export class BitcoinService {
  private apiBase: string
  private network: bitcoin.Network
  private isTestnet: boolean
  private bitcoinFork: BitcoinFork
  /** Esplora indexer — required for address UTXO lists; Bitcoin Core JSON-RPC alone cannot serve arbitrary-address UTXOs. */
  private static readonly MAINNET_API_FALLBACKS: BitcoinApiEndpoint[] = [
    { base: 'https://blockstream.info/api', kind: 'esplora' },
  ]
  private static readonly TESTNET4_API_FALLBACKS: BitcoinApiEndpoint[] = [
    { base: 'https://mempool.space/testnet4/api', kind: 'esplora' },
    { base: 'https://mempool.ninja/testnet4/api', kind: 'esplora' },
  ]

  /**
   * Testnet3 vs testnet4 share `tb1` addresses but not UTXO sets. Never mix Esplora bases across forks.
   */
  private getTestnetForkEndpoints(): BitcoinApiEndpoint[] {
    const env = import.meta.env as Record<string, string | undefined>
    const addDedup = <T extends { base: string }>(list: T[], item: T) => {
      if (!list.some((x) => x.base === item.base)) list.push(item)
    }
    const endpoints: BitcoinApiEndpoint[] = []
    if (this.bitcoinFork === 'testnet4') {
      const raw = env.VITE_BITCOIN_TESTNET4_API?.trim()
      if (raw)
        addDedup(endpoints, {
          base: this.normalizeBase(raw),
          kind: this.detectApiKind(raw),
        })
      for (const endpoint of BitcoinService.TESTNET4_API_FALLBACKS) {
        addDedup(endpoints, {
          base: this.normalizeBase(endpoint.base),
          kind: endpoint.kind,
        })
      }
    } else if (this.bitcoinFork === 'testnet3') {
      for (const key of [
        'VITE_BITCOIN_TESTNET3_API',
        'VITE_BITCOIN_TESTNET_API',
      ] as const) {
        const raw = env[key]?.trim()
        if (!raw) continue
        addDedup(endpoints, {
          base: this.normalizeBase(raw),
          kind: this.detectApiKind(raw),
        })
      }
      addDedup(endpoints, {
        base: 'https://mempool.space/testnet/api',
        kind: 'esplora',
      })
      addDedup(endpoints, {
        base: 'https://blockstream.info/testnet/api',
        kind: 'esplora',
      })
    }
    return endpoints
  }

  constructor(apiBase: string, isTestnet: boolean, bitcoinFork?: BitcoinFork) {
    this.apiBase = apiBase.replace(/\/$/, '')
    this.isTestnet = isTestnet
    this.bitcoinFork = bitcoinFork ?? (isTestnet ? 'testnet4' : 'mainnet')
    this.network = BitcoinKeyService.getNetwork(isTestnet)
  }

  private normalizeBase(base: string): string {
    return base.replace(/\/$/, '')
  }

  private detectApiKind(base: string): BitcoinApiKind {
    return /alchemy\.com\/v2\//i.test(base) ? 'alchemy' : 'esplora'
  }

  private getApiCandidates(kind?: BitcoinApiKind): BitcoinApiEndpoint[] {
    const candidates: BitcoinApiEndpoint[] = [
      {
        base: this.normalizeBase(this.apiBase),
        kind: this.detectApiKind(this.apiBase),
      },
    ]

    if (this.isTestnet) {
      candidates.push(...this.getTestnetForkEndpoints())
    } else {
      candidates.push(
        ...BitcoinService.MAINNET_API_FALLBACKS.map((e) => ({
          base: this.normalizeBase(e.base),
          kind: e.kind,
        }))
      )
    }

    const unique = candidates.filter((candidate, index, arr) => {
      return arr.findIndex((x) => x.base === candidate.base) === index
    })

    return kind ? unique.filter((c) => c.kind === kind) : unique
  }

  private assertAddressMatchesNetwork(
    address: string,
    label: 'source' | 'recipient' | 'address' = 'address'
  ): void {
    const target =
      label === 'recipient'
        ? 'recipient Bitcoin address'
        : label === 'source'
          ? 'source Bitcoin address'
          : 'Bitcoin address'
    if (!BitcoinKeyService.isValidAddress(address)) {
      throw new Error(
        `Invalid ${target}. Only bech32 P2WPKH (bc1q/tb1q) is supported`
      )
    }
    if (!BitcoinKeyService.isValidAddress(address, this.isTestnet)) {
      const expectedPrefix = this.isTestnet ? 'tb1q' : 'bc1q'
      throw new Error(
        `Address network mismatch for ${target}: expected ${expectedPrefix} address for current chain`
      )
    }
  }

  private async fetchWithFallback(
    path: string,
    init?: RequestInit,
    kind?: BitcoinApiKind
  ): Promise<Response> {
    const failures: string[] = []

    for (const endpoint of this.getApiCandidates(kind)) {
      try {
        const res = await fetch(`${endpoint.base}${path}`, init)
        if (res.ok) return res

        const body = await res.text().catch(() => '')
        failures.push(
          `${endpoint.base} [${endpoint.kind}] -> ${res.status} ${res.statusText || '(no statusText)'} ${body}`.trim()
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        failures.push(`${endpoint.base} [${endpoint.kind}] -> ${msg}`)
      }
    }

    throw new Error(
      `Request failed for ${path}. Tried ${failures.length} endpoint(s)${kind ? ` (${kind})` : ''}: ${failures.join(' | ')}`
    )
  }

  /**
   * Alchemy Bitcoin endpoints speak JSON-RPC (Bitcoin Core–compatible), not Esplora REST.
   */
  private async alchemyJsonRpc(
    baseUrl: string,
    method: string,
    params: unknown[] = []
  ): Promise<unknown> {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const body = await res.text().catch(() => '')
    let parsed: {
      result?: unknown
      error?: { code?: number; message?: string }
    }
    try {
      parsed = JSON.parse(body) as {
        result?: unknown
        error?: { code?: number; message?: string }
      }
    } catch {
      throw new Error(
        `Alchemy JSON-RPC invalid response: HTTP ${res.status} ${body}`
      )
    }
    if (parsed.error) {
      throw new Error(
        `Alchemy JSON-RPC error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`
      )
    }
    if (!res.ok) {
      throw new Error(`Alchemy JSON-RPC HTTP ${res.status}: ${body}`)
    }
    return parsed.result
  }

  /** Bitcoin Core `estimatesmartfee` returns BTC/kB; convert to sat/vB for Esplora-style fee math. */
  private static btcPerKbToSatPerVbyte(feerateBtcPerKb: number): number {
    if (!Number.isFinite(feerateBtcPerKb) || feerateBtcPerKb <= 0) return 5
    return Math.max(1, Math.ceil((feerateBtcPerKb * SATS_PER_BTC) / 1000))
  }

  private async getFeeRateViaAlchemyRpc(targetBlocks: number): Promise<number> {
    const failures: string[] = []
    const confTarget = Math.min(1008, Math.max(1, targetBlocks))
    for (const endpoint of this.getApiCandidates('alchemy')) {
      try {
        const result = await this.alchemyJsonRpc(
          endpoint.base,
          'estimatesmartfee',
          [confTarget, 'ECONOMICAL']
        )
        const obj = result as { feerate?: number }
        if (obj?.feerate !== undefined && obj.feerate > 0) {
          return BitcoinService.btcPerKbToSatPerVbyte(obj.feerate)
        }
        failures.push(
          `${endpoint.base} -> empty or invalid feerate: ${JSON.stringify(result)}`
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        failures.push(`${endpoint.base} -> ${msg}`)
      }
    }
    throw new Error(
      `estimatesmartfee failed. Tried ${failures.length} endpoint(s): ${failures.join(' | ')}`
    )
  }

  private async broadcastViaAlchemyRpc(txHex: string): Promise<string> {
    const failures: string[] = []
    for (const endpoint of this.getApiCandidates('alchemy')) {
      try {
        const result = await this.alchemyJsonRpc(
          endpoint.base,
          'sendrawtransaction',
          [txHex]
        )
        if (typeof result === 'string' && result.length > 0) return result
        failures.push(
          `${endpoint.base} -> unexpected result: ${JSON.stringify(result)}`
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        failures.push(`${endpoint.base} -> ${msg}`)
      }
    }
    throw new Error(
      `sendrawtransaction failed. Tried ${failures.length} endpoint(s): ${failures.join(' | ')}`
    )
  }

  async getUtxos(address: string): Promise<Utxo[]> {
    this.assertAddressMatchesNetwork(address, 'address')
    const res = await this.fetchWithFallback(
      `/address/${address}/utxo`,
      undefined,
      'esplora'
    )
    return res.json()
  }

  private async getAddressStats(
    address: string
  ): Promise<EsploraAddressResponse> {
    this.assertAddressMatchesNetwork(address, 'address')
    const res = await this.fetchWithFallback(
      `/address/${address}`,
      undefined,
      'esplora'
    )
    return res.json()
  }

  private static balanceFromAddressStats(
    stats: EsploraAddressResponse
  ): number {
    const confirmed =
      (stats.chain_stats?.funded_txo_sum ?? 0) -
      (stats.chain_stats?.spent_txo_sum ?? 0)
    const mempool =
      (stats.mempool_stats?.funded_txo_sum ?? 0) -
      (stats.mempool_stats?.spent_txo_sum ?? 0)
    return Math.max(0, confirmed + mempool)
  }

  /** Balance in BTC (summing all UTXOs). */
  async getBalance(address: string): Promise<number> {
    return (await this.getBalanceSats(address)) / SATS_PER_BTC
  }

  /** Balance in satoshis. */
  async getBalanceSats(address: string): Promise<number> {
    const stats = await this.getAddressStats(address)
    return BitcoinService.balanceFromAddressStats(stats)
  }

  /**
   * Get fee rate estimates from the API.
   * Returns fee rate in sat/vByte for the target confirmation blocks.
   */
  async getFeeRate(targetBlocks: number = 3): Promise<number> {
    try {
      const res = await this.fetchWithFallback(
        '/fee-estimates',
        undefined,
        'esplora'
      )
      const data: FeeEstimates = await res.json()
      return data[String(targetBlocks)] ?? data['6'] ?? data['3'] ?? 5
    } catch {
      try {
        return await this.getFeeRateViaAlchemyRpc(targetBlocks)
      } catch {
        return 5
      }
    }
  }

  /**
   * Estimate fee in satoshis for a P2WPKH transaction.
   * Uses a rough vBytes estimate based on input/output count.
   */
  async estimateFeeSats(
    address: string,
    amountSats: number,
    targetBlocks = 3
  ): Promise<{ feeSats: number; feeRate: number }> {
    const [utxos, feeRate] = await Promise.all([
      this.getUtxos(address),
      this.getFeeRate(targetBlocks),
    ])

    let inputCount = 0
    let totalIn = 0
    for (const u of utxos) {
      inputCount++
      totalIn += u.value
      if (totalIn >= amountSats) break
    }

    // P2WPKH vBytes estimate: ~68 per input + ~31 per output + ~11 overhead
    const hasChange = totalIn - amountSats > DUST_THRESHOLD
    const outputCount = hasChange ? 2 : 1
    const vBytes = 11 + inputCount * 68 + outputCount * 31
    const feeSats = Math.ceil(feeRate * vBytes)

    return { feeSats, feeRate }
  }

  /**
   * Build and sign a P2WPKH transaction.
   * Returns the raw transaction hex and the actual fee paid.
   */
  async buildAndSignTransaction(params: {
    fromAddress: string
    toAddress: string
    amountSats: number
    masterSeed: Uint8Array
    addressIndex: number
    feeRate?: number
  }): Promise<{ txHex: string; fee: number }> {
    const { fromAddress, toAddress, amountSats, masterSeed, addressIndex } =
      params

    this.assertAddressMatchesNetwork(fromAddress, 'source')
    this.assertAddressMatchesNetwork(toAddress, 'recipient')

    const utxos = await this.getUtxos(fromAddress)
    if (!utxos.length) throw new Error('No UTXOs available')

    const feeRate = params.feeRate ?? (await this.getFeeRate())
    const signer = BitcoinKeyService.getSigner(
      masterSeed,
      this.isTestnet,
      addressIndex
    )

    // Coin selection: accumulate until we have enough
    const selected: Utxo[] = []
    let totalIn = 0

    // Sort by value descending for slightly better selection
    const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value)
    for (const u of sortedUtxos) {
      selected.push(u)
      totalIn += u.value
      // Rough check: enough for amount + minimum possible fee
      if (totalIn >= amountSats + Math.ceil(feeRate * 100)) break
    }

    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const outputScript = bitcoin.address.toOutputScript(
      fromAddress,
      this.network
    )

    const psbt = new bitcoin.Psbt({ network: this.network })

    for (const u of selected) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: outputScript,
          value: BigInt(u.value),
        },
      })
    }

    psbt.addOutput({ address: toAddress, value: BigInt(amountSats) })

    // Estimate fee using actual input/output counts
    const hasChangeEstimate = true
    const outputCount = hasChangeEstimate ? 2 : 1
    const vBytesEstimate = 11 + selected.length * 68 + outputCount * 31
    const feeEstimate = Math.ceil(feeRate * vBytesEstimate)

    if (totalIn < amountSats + feeEstimate) {
      // Re-check without change output
      const vBytesNoChange = 11 + selected.length * 68 + 1 * 31
      const feeNoChange = Math.ceil(feeRate * vBytesNoChange)
      if (totalIn < amountSats + feeNoChange) {
        throw new Error('Insufficient balance to cover amount + fee')
      }
      // No change output — remainder goes to fee
    } else {
      const change = totalIn - amountSats - feeEstimate
      if (change >= DUST_THRESHOLD) {
        psbt.addOutput({ address: fromAddress, value: BigInt(change) })
      }
    }

    // Sign all inputs
    selected.forEach((_, idx) => {
      psbt.signInput(idx, signer)
    })

    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction()
    const actualFee =
      totalIn - Number(tx.outs.reduce((sum, o) => sum + BigInt(o.value), 0n))

    return { txHex: tx.toHex(), fee: actualFee }
  }

  /** Broadcast a raw transaction hex. Returns the txid. */
  async broadcast(txHex: string): Promise<string> {
    try {
      const res = await this.fetchWithFallback(
        '/tx',
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex,
        },
        'esplora'
      )
      return res.text()
    } catch {
      return this.broadcastViaAlchemyRpc(txHex)
    }
  }

  /** Convert satoshis to BTC string. */
  static satsToBtc(sats: number): string {
    return (sats / SATS_PER_BTC).toFixed(8)
  }

  /** Convert BTC to satoshis. */
  static btcToSats(btc: number): number {
    return Math.round(btc * SATS_PER_BTC)
  }
}
