import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import {
  getNetwork,
  deriveNode,
  isValidDogecoinAddress,
} from './chainplugins/dogecoin/dogecoinPlugin'

bitcoin.initEccLib(ecc)

const SATS_PER_DOGE = 100_000_000
const DUST_THRESHOLD = 100_000 // 0.001 DOGE — Dogecoin dust is higher than Bitcoin

/**
 * Blockbook API response for /api/v2/address/<addr>?details=basic
 */
interface BlockbookAddressBasic {
  balance: string
  unconfirmedBalance: string
}

/**
 * Blockbook UTXO format from /api/v2/utxo/<addr>
 */
interface BlockbookUtxo {
  txid: string
  vout: number
  value: string
  confirmations: number
}

/**
 * DogecoinService — UTXO management, balance queries, tx building, and broadcast
 * for the Dogecoin L1 network. Uses the Blockbook REST API format.
 */
export class DogecoinService {
  private apiBase: string
  private network: bitcoin.Network
  private isTestnet: boolean

  constructor(apiBase: string, isTestnet: boolean) {
    this.apiBase = apiBase.replace(/\/$/, '')
    this.isTestnet = isTestnet
    this.network = getNetwork(isTestnet)
  }

  private assertAddress(address: string, label = 'address'): void {
    if (!isValidDogecoinAddress(address, this.isTestnet)) {
      const expected = this.isTestnet
        ? 'n-prefix (testnet)'
        : 'D-prefix (mainnet)'
      throw new Error(
        `Invalid Dogecoin ${label}: expected ${expected} P2PKH address`
      )
    }
  }

  /** Fetch JSON from the Blockbook API. */
  private async fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, init)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Dogecoin API error: HTTP ${res.status} ${body}`)
    }
    return res.json() as Promise<T>
  }

  /** Balance in DOGE. */
  async getBalance(address: string): Promise<number> {
    return (await this.getBalanceSats(address)) / SATS_PER_DOGE
  }

  /** Balance in koinu (satoshi equivalent). */
  async getBalanceSats(address: string): Promise<number> {
    this.assertAddress(address)
    const data = await this.fetchApi<BlockbookAddressBasic>(
      `/api/v2/address/${address}?details=basic`
    )
    const confirmed = parseInt(data.balance || '0', 10)
    const unconfirmed = parseInt(data.unconfirmedBalance || '0', 10)
    return Math.max(0, confirmed + unconfirmed)
  }

  /** Get UTXOs for an address via Blockbook. */
  async getUtxos(address: string): Promise<BlockbookUtxo[]> {
    this.assertAddress(address)
    return this.fetchApi<BlockbookUtxo[]>(`/api/v2/utxo/${address}`)
  }

  /** Default fee rate in sat/byte. Dogecoin has very low fees. */
  async getFeeRate(): Promise<number> {
    // Dogecoin recommended minimum relay fee: 0.01 DOGE/kB = 1000 sat/kB = 1 sat/byte
    // Use a conservative 10 sat/byte for fast confirmation
    return 10
  }

  /** Build and sign a P2PKH transaction. */
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

    this.assertAddress(fromAddress, 'source')
    this.assertAddress(toAddress, 'recipient')

    const utxos = await this.getUtxos(fromAddress)
    if (!utxos.length) throw new Error('No UTXOs available')

    const feeRate = params.feeRate ?? (await this.getFeeRate())
    const signer = deriveNode(masterSeed, this.isTestnet, addressIndex)
    if (!signer.privateKey) throw new Error('Missing private key')

    // Sort by value descending
    const sorted = [...utxos].sort(
      (a, b) => parseInt(b.value) - parseInt(a.value)
    )

    const selected: BlockbookUtxo[] = []
    let totalIn = 0
    for (const u of sorted) {
      selected.push(u)
      totalIn += parseInt(u.value)
      if (totalIn >= amountSats + Math.ceil(feeRate * 300)) break
    }

    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const keyPair = {
      publicKey: Buffer.from(signer.publicKey),
      sign: (hash: Uint8Array) => {
        const sig = ecc.sign(hash, signer.privateKey!)
        return Buffer.from(sig)
      },
    }

    const tx = new bitcoin.Transaction()
    tx.version = 1

    for (const u of selected) {
      tx.addInput(Buffer.from(u.txid, 'hex').reverse(), u.vout)
    }

    tx.addOutput(
      bitcoin.address.toOutputScript(toAddress, this.network),
      BigInt(amountSats)
    )

    // Estimate fee: P2PKH ~148 bytes/input + ~34 bytes/output + 10 overhead
    const hasChange = true
    const outputCount = hasChange ? 2 : 1
    const vBytes = 10 + selected.length * 148 + outputCount * 34
    const feeEstimate = Math.ceil(feeRate * vBytes)

    if (totalIn < amountSats + feeEstimate) {
      const vBytesNoChange = 10 + selected.length * 148 + 1 * 34
      const feeNoChange = Math.ceil(feeRate * vBytesNoChange)
      if (totalIn < amountSats + feeNoChange) {
        throw new Error('Insufficient balance to cover amount + fee')
      }
    } else {
      const change = totalIn - amountSats - feeEstimate
      if (change >= DUST_THRESHOLD) {
        tx.addOutput(
          bitcoin.address.toOutputScript(fromAddress, this.network),
          BigInt(change)
        )
      }
    }

    // Sign all inputs (P2PKH)
    for (let i = 0; i < selected.length; i++) {
      const prevOutScript = bitcoin.address.toOutputScript(
        fromAddress,
        this.network
      )
      const signatureHash = tx.hashForSignature(
        i,
        prevOutScript,
        bitcoin.Transaction.SIGHASH_ALL
      )
      const signature = keyPair.sign(signatureHash)
      const encodedSig = bitcoin.script.signature.encode(
        signature,
        bitcoin.Transaction.SIGHASH_ALL
      )
      tx.setInputScript(
        i,
        bitcoin.script.compile([encodedSig, keyPair.publicKey])
      )
    }

    const txHex = tx.toHex()
    const totalOut = tx.outs.reduce((sum, o) => sum + Number(o.value), 0)
    const actualFee = totalIn - totalOut

    return { txHex, fee: actualFee }
  }

  /** Broadcast a raw transaction hex via Blockbook. Returns txid. */
  async broadcast(txHex: string): Promise<string> {
    const data = await this.fetchApi<{ result: string }>('/api/v2/sendtx/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    })
    return data.result
  }

  static satsToDoge(sats: number): string {
    return (sats / SATS_PER_DOGE).toFixed(8)
  }

  static dogeToSats(doge: number): number {
    return Math.round(doge * SATS_PER_DOGE)
  }
}
