import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import {
  getNetwork,
  deriveNode,
  isValidDogecoinAddress,
} from './chainplugins/dogecoin/dogecoinPlugin'

bitcoin.initEccLib(ecc)

const SATS_PER_DOGE = 100_000_000
const DUST_THRESHOLD = 100_000 // 0.001 DOGE

/** BlockCypher /addrs/{addr}/balance response. */
interface BlockCypherBalance {
  final_balance: number
}

/** BlockCypher /addrs/{addr}?unspentOnly=true response. */
interface BlockCypherAddress {
  txrefs?: BlockCypherTxRef[]
}

interface BlockCypherTxRef {
  tx_hash: string
  tx_output_n: number
  value: number
  spent: boolean
  confirmations: number
}

interface Utxo {
  txid: string
  vout: number
  value: number
}

/**
 * DogecoinService — balance, UTXOs, tx building, and broadcast
 * for the Dogecoin L1 network via BlockCypher REST API.
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
    const data = await this.fetchApi<BlockCypherBalance>(
      `/addrs/${address}/balance`
    )
    return Math.max(0, data.final_balance ?? 0)
  }

  /** Get UTXOs for an address. */
  async getUtxos(address: string): Promise<Utxo[]> {
    this.assertAddress(address)
    const data = await this.fetchApi<BlockCypherAddress>(
      `/addrs/${address}?unspentOnly=true&limit=50`
    )
    return (data.txrefs ?? [])
      .filter((ref) => !ref.spent)
      .map((ref) => ({
        txid: ref.tx_hash,
        vout: ref.tx_output_n,
        value: ref.value,
      }))
  }

  /** Default fee rate in sat/byte. */
  async getFeeRate(): Promise<number> {
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

    const sorted = [...utxos].sort((a, b) => b.value - a.value)

    const selected: Utxo[] = []
    let totalIn = 0
    for (const u of sorted) {
      selected.push(u)
      totalIn += u.value
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

    // P2PKH ~148 bytes/input + ~34 bytes/output + 10 overhead
    const outputCount = 2
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

  /** Broadcast a raw transaction hex. Returns txid. */
  async broadcast(txHex: string): Promise<string> {
    const data = await this.fetchApi<{ tx: { hash: string } }>('/txs/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx: txHex }),
    })
    return data.tx.hash
  }

  static satsToDoge(sats: number): string {
    return (sats / SATS_PER_DOGE).toFixed(8)
  }

  static dogeToSats(doge: number): number {
    return Math.round(doge * SATS_PER_DOGE)
  }
}
