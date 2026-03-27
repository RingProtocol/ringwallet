import { BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { ethers } from 'ethers'
import { ChainFamily } from '../../../models/ChainType'
import type { ChainPlugin, DerivedAccount, SignRequest, SignResult } from '../types'
import { chainRegistry } from '../registry'

const bip32 = BIP32Factory(ecc)

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const v of values) {
    const b = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i]
    }
  }
  return chk
}

function bech32HrpExpand(hrp: string): number[] {
  const result: number[] = []
  for (const c of hrp) result.push(c.charCodeAt(0) >> 5)
  result.push(0)
  for (const c of hrp) result.push(c.charCodeAt(0) & 31)
  return result
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]
  const polymod = bech32Polymod(values) ^ 1
  const checksum: number[] = []
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 31)
  }
  return checksum
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0
  let bits = 0
  const result: number[] = []
  const maxv = (1 << toBits) - 1

  for (const value of data) {
    acc = (acc << fromBits) | value
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      result.push((acc >> bits) & maxv)
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv)
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    throw new Error('Invalid bit conversion')
  }

  return result
}

function bech32Encode(hrp: string, data: Uint8Array): string {
  const words = convertBits(data, 8, 5, true)
  const checksum = bech32CreateChecksum(hrp, words)
  let result = hrp + '1'
  for (const w of words) result += BECH32_CHARSET[w]
  for (const c of checksum) result += BECH32_CHARSET[c]
  return result
}

function bech32Decode(str: string): { hrp: string; data: Uint8Array } | null {
  const pos = str.lastIndexOf('1')
  if (pos < 1 || pos + 7 > str.length) return null
  const hrp = str.slice(0, pos)
  const dataChars = str.slice(pos + 1)
  const words: number[] = []
  for (const c of dataChars) {
    const idx = BECH32_CHARSET.indexOf(c)
    if (idx < 0) return null
    words.push(idx)
  }
  if (bech32Polymod([...bech32HrpExpand(hrp), ...words]) !== 1) return null
  const dataWords = words.slice(0, -6)
  const decoded = convertBits(new Uint8Array(dataWords), 5, 8, false)
  return { hrp, data: new Uint8Array(decoded) }
}

const DEFAULT_COIN_TYPE = 118
const DEFAULT_HRP = 'cosmos'

function derivationPath(index: number, coinType: number): string {
  return `m/44'/${coinType}'/0'/0/${index}`
}

class CosmosChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Cosmos

  /**
   * Derive Cosmos accounts.
   * options.coinType — BIP44 coin type (default 118)
   * options.addressPrefix — Bech32 HRP (default "cosmos")
   */
  deriveAccounts(
    masterSeed: Uint8Array,
    count: number,
    options?: Record<string, unknown>,
  ): DerivedAccount[] {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error('[CosmosPlugin] Invalid masterSeed: must be at least 16 bytes')
    }

    const coinType = (options?.coinType as number) ?? DEFAULT_COIN_TYPE
    const hrp = (options?.addressPrefix as string) ?? DEFAULT_HRP
    const root = bip32.fromSeed(Buffer.from(masterSeed))
    const accounts: DerivedAccount[] = []

    for (let i = 0; i < count; i++) {
      const path = derivationPath(i, coinType)
      const child = root.derivePath(path)
      if (!child.privateKey) throw new Error('Missing private key')

      const compressedPubKey = child.publicKey
      const sha = ethers.getBytes(ethers.sha256(compressedPubKey))
      const ripemd = ethers.getBytes(ethers.ripemd160(sha))
      const address = bech32Encode(hrp, ripemd)

      accounts.push({
        index: i,
        address,
        privateKey: ethers.hexlify(Buffer.from(child.privateKey)),
        path,
        meta: {
          publicKey: ethers.hexlify(Buffer.from(compressedPubKey)),
          coinType,
          addressPrefix: hrp,
        },
      })
    }

    return accounts
  }

  isValidAddress(address: string): boolean {
    if (!address) return false
    try {
      const decoded = bech32Decode(address.toLowerCase())
      return decoded !== null && decoded.data.length === 20
    } catch {
      return false
    }
  }

  async signTransaction(_privateKey: string, _req: SignRequest): Promise<SignResult> {
    throw new Error('[CosmosPlugin] signTransaction not yet implemented')
  }

  async broadcastTransaction(_signed: SignResult, _rpcUrl: string): Promise<string> {
    throw new Error('[CosmosPlugin] broadcastTransaction not yet implemented')
  }
}

chainRegistry.register(new CosmosChainPlugin())
