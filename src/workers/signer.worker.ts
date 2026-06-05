/**
 * Isolated signing Worker.
 *
 * This Worker is the ONLY place where:
 *  - ringsecurity_masterSeed is stored (XOR-obfuscated)
 *  - HD private keys are derived
 *  - transaction signing happens
 *
 * It NEVER sends privateKey or ringsecurity_masterSeed back to the main thread.
 * All it returns are: addresses, derivation paths, and signed transaction payloads.
 */

import { ethers } from 'ethers'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { derivePath } from 'ed25519-hd-key'
import type { BIP32Interface, BIP32API } from 'bip32'
import { ChainFamily } from '../models/ChainType'
import {
  secureZero,
  generateScrambleKey,
  ringsecurity_xorScrambleInPlace,
} from '../utils/memoryCrypto'
import {
  generateEcdhKeyPair,
  exportPublicKeyJwk,
  encryptSeed as ecdhEncryptSeed,
  decryptSeed,
  type EncryptedSeed,
} from '../utils/seedTransport'

/**
 * Lazily-loaded UTXO crypto modules (bitcoinjs-lib, bip32, tiny-secp256k1).
 * These use WASM which can hang Worker module evaluation under Next.js dev.
 * Dynamic import ensures the Worker registers onmessage immediately.
 */
type UtxoMods = typeof import('bitcoinjs-lib')
type TinySecp = typeof import('tiny-secp256k1')

let _utxoMods: {
  btc: UtxoMods
  bip32Factory: (ecc: TinySecp) => BIP32API
  tinySecp: TinySecp
} | null = null

/** Dynamically load WASM-dependent UTXO modules (bitcoinjs-lib, bip32, tiny-secp256k1). */
async function loadUtxo() {
  if (!_utxoMods) {
    const [btcMod, bip32Mod, tinyMod] = await Promise.all([
      import('bitcoinjs-lib'),
      import('bip32'),
      import('tiny-secp256k1'),
    ])
    btcMod.initEccLib(tinyMod)
    _utxoMods = {
      btc: btcMod,
      bip32Factory: bip32Mod.BIP32Factory,
      tinySecp: tinyMod,
    }
  }
  return _utxoMods
}

/* ── Dogecoin network params ─────────────────────────────────────────── */

const DOGECOIN_MAINNET: {
  messagePrefix: string
  bech32: string
  bip32: { public: number; private: number }
  pubKeyHash: number
  scriptHash: number
  wif: number
} = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '',
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
}

const DOGECOIN_TESTNET: {
  messagePrefix: string
  bech32: string
  bip32: { public: number; private: number }
  pubKeyHash: number
  scriptHash: number
  wif: number
} = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '',
  bip32: { public: 0x043587cf, private: 0x04358394 },
  pubKeyHash: 0x71,
  scriptHash: 0xc4,
  wif: 0xf1,
}

/* ── Tron address helpers ─────────────────────────────────────────────── */

const TRON_ADDRESS_PREFIX = 0x41
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function encodeBase58(data: Uint8Array): string {
  const digits = [0]
  for (const byte of data) {
    let carry = byte
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let result = ''
  for (const byte of data) {
    if (byte !== 0) break
    result += BASE58_ALPHABET[0]
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]]
  }
  return result
}

function toBase58Check(payload: Uint8Array): string {
  const hash1 = ethers.getBytes(ethers.sha256(payload))
  const hash2 = ethers.getBytes(ethers.sha256(hash1))
  const checksum = hash2.slice(0, 4)
  const full = new Uint8Array(payload.length + 4)
  full.set(payload)
  full.set(checksum, payload.length)
  return encodeBase58(full)
}

function publicKeyToTronAddress(compressedPubKey: string): string {
  const uncompressed = ethers.SigningKey.computePublicKey(
    compressedPubKey,
    false
  )
  const pubBytes = ethers.getBytes(uncompressed)
  const hash = ethers.keccak256(pubBytes.slice(1))
  const addressBytes = ethers.getBytes(hash).slice(12)
  const payload = new Uint8Array(21)
  payload[0] = TRON_ADDRESS_PREFIX
  payload.set(addressBytes, 1)
  return toBase58Check(payload)
}

/* ── Cosmos/bech32 helpers ────────────────────────────────────────────── */

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

function convertBits(
  data: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] {
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
    if (bits > 0) result.push((acc << (toBits - bits)) & maxv)
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

/* ── internal state ─────────────────────────────────────────────────────── */

let ringsecurity_obfuscatedSeed: Uint8Array | null = null
let ringsecurity_scrambleKey: Uint8Array | null = null

/** ECDH key pair generated on Worker startup for encrypted seed transport. */
let ecdhKeyPair: CryptoKeyPair | null = null

/* ── ECDH key pair init (runs once on Worker startup) ─────────────────── */

async function initEcdhKeyPair(): Promise<void> {
  if (!ecdhKeyPair) {
    ecdhKeyPair = await generateEcdhKeyPair()
  }
}

/* ── seed lifecycle ───────────────────────────────────────────────────── */

function setSeed(seed: Uint8Array): void {
  if (ringsecurity_obfuscatedSeed && ringsecurity_scrambleKey) {
    clearSeed()
  }
  ringsecurity_scrambleKey = generateScrambleKey()
  ringsecurity_obfuscatedSeed = new Uint8Array(seed)
  ringsecurity_xorScrambleInPlace(
    ringsecurity_obfuscatedSeed,
    ringsecurity_scrambleKey
  )
}

function getSeed(): Uint8Array {
  if (!ringsecurity_obfuscatedSeed || !ringsecurity_scrambleKey) {
    throw new Error('SignerWorker: seed not initialized')
  }
  const seed = new Uint8Array(ringsecurity_obfuscatedSeed)
  ringsecurity_xorScrambleInPlace(seed, ringsecurity_scrambleKey)
  return seed
}

function clearSeed(): void {
  if (ringsecurity_obfuscatedSeed) {
    secureZero(ringsecurity_obfuscatedSeed)
    ringsecurity_obfuscatedSeed = null
  }
  if (ringsecurity_scrambleKey) {
    secureZero(ringsecurity_scrambleKey)
    ringsecurity_scrambleKey = null
  }
}

/* ── EVM signing ───────────────────────────────────────────────────────── */

async function signEvm(
  index: number,
  to: string,
  amount: string,
  chainId: number,
  rpcUrl: string | null,
  tokenOpts?: { address: string; decimals: number },
  txData?: string,
  gasLimit?: string
): Promise<string> {
  const seed = getSeed()
  try {
    const seedHex = ethers.hexlify(seed)
    const rootNode = ethers.HDNodeWallet.fromSeed(seedHex)
    const path = `m/44'/60'/0'/0/${index}`
    const child = rootNode.derivePath(path)
    const wallet = new ethers.Wallet(child.privateKey)

    let txTo: string
    let txValue: bigint
    let finalData: string

    if (txData && txData !== '0x') {
      // Contract call with custom data (e.g., swap, bridge)
      txTo = to
      txValue = ethers.parseEther(amount || '0')
      finalData = txData
    } else if (tokenOpts) {
      const iface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ])
      const amountWei = ethers.parseUnits(amount || '0', tokenOpts.decimals)
      finalData = iface.encodeFunctionData('transfer', [to, amountWei])
      txTo = tokenOpts.address
      txValue = 0n
    } else {
      finalData = '0x'
      txTo = to
      txValue = ethers.parseEther(amount || '0')
    }

    if (rpcUrl) {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const nonce = await provider.getTransactionCount(wallet.address)
      const feeData = await provider.getFeeData()
      const estimated = await provider.estimateGas({
        from: wallet.address,
        to: txTo,
        value: txValue,
        data: finalData,
      })
      const computedGasLimit = gasLimit
        ? BigInt(gasLimit)
        : estimated + estimated / 10n
      const maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei')
      const maxFeePerGas =
        feeData.maxFeePerGas ||
        maxPriorityFeePerGas + ethers.parseUnits('30', 'gwei')
      const rawTx = await wallet.signTransaction({
        to: txTo,
        value: txValue,
        data: finalData,
        nonce,
        chainId,
        type: 2,
        gasLimit: computedGasLimit < 31500n ? 31500n : computedGasLimit,
        maxPriorityFeePerGas,
        maxFeePerGas,
      })
      return rawTx
    }

    return wallet.signTransaction({
      to: txTo,
      value: txValue,
      data: finalData,
      nonce: 0,
      gasLimit: gasLimit ? BigInt(gasLimit) : 65000,
      gasPrice: ethers.parseUnits('20', 'gwei'),
      chainId,
      type: 0,
    })
  } finally {
    secureZero(seed)
  }
}

/* ── Solana signing ───────────────────────────────────────────────────── */

async function signSolana(
  index: number,
  to: string,
  amount: number,
  rpcUrl: string
): Promise<{
  serializedTx: Buffer
  blockhash: string
  lastValidBlockHeight: number
}> {
  const seed = getSeed()
  try {
    const { key } = derivePath(
      `m/44'/501'/${index}'`,
      Buffer.from(seed).toString('hex')
    )
    const keypair = Keypair.fromSeed(key.slice(0, 32))

    const connection = new Connection(rpcUrl, 'confirmed')
    const toPubkey = new PublicKey(to)
    const fromPubkey = keypair.publicKey

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash()
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    )
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPubkey
    transaction.sign(keypair)

    const serialized = transaction.serialize()
    return {
      serializedTx: Buffer.from(serialized),
      blockhash,
      lastValidBlockHeight,
    }
  } finally {
    secureZero(seed)
  }
}

/* ── Bitcoin signing helpers ───────────────────────────────────────────── */

const BTC_DUST_THRESHOLD = 546
const DOGE_DUST_THRESHOLD = 100_000

interface Utxo {
  txid: string
  vout: number
  value: number
}

async function deriveBitcoinSigner(
  seed: Uint8Array,
  index: number,
  isTestnet: boolean
): Promise<BIP32Interface> {
  const { btc, bip32Factory, tinySecp } = await loadUtxo()
  const network = isTestnet ? btc.networks.testnet : btc.networks.bitcoin
  const bip32 = bip32Factory(tinySecp)
  const root = bip32.fromSeed(Buffer.from(seed), network)
  const base = isTestnet ? "m/44'/1'/0'/0" : "m/44'/0'/0'/0"
  return root.derivePath(`${base}/${index}`)
}

async function deriveDogecoinSigner(
  seed: Uint8Array,
  index: number,
  isTestnet: boolean
): Promise<BIP32Interface> {
  const { bip32Factory, tinySecp } = await loadUtxo()
  const bip32 = bip32Factory(tinySecp)
  const network = isTestnet ? DOGECOIN_TESTNET : DOGECOIN_MAINNET
  const root = bip32.fromSeed(Buffer.from(seed), network)
  const base = isTestnet ? "m/44'/1'/0'/0" : "m/44'/3'/0'/0"
  return root.derivePath(`${base}/${index}`)
}

/** Fetch UTXOs from Esplora-compatible API (Bitcoin). */
async function fetchBitcoinUtxos(
  rpcUrl: string,
  address: string
): Promise<Utxo[]> {
  const res = await fetch(`${rpcUrl}/address/${address}/utxo`)
  if (!res.ok) throw new Error(`Bitcoin UTXO fetch failed: HTTP ${res.status}`)
  return res.json()
}

/** Fetch fee estimates from Esplora-compatible API (Bitcoin). */
async function fetchBitcoinFeeRate(rpcUrl: string): Promise<number> {
  try {
    const res = await fetch(`${rpcUrl}/fee-estimates`)
    if (!res.ok) return 5
    const data: Record<string, number> = await res.json()
    return data['3'] ?? data['6'] ?? 5
  } catch {
    return 5
  }
}

/** Fetch UTXOs from BlockCypher-compatible API (Dogecoin). */
async function fetchDogecoinUtxos(
  rpcUrl: string,
  address: string
): Promise<Utxo[]> {
  const res = await fetch(
    `${rpcUrl}/addrs/${address}?unspentOnly=true&limit=50`
  )
  if (!res.ok) throw new Error(`Dogecoin UTXO fetch failed: HTTP ${res.status}`)
  const data: {
    txrefs?: Array<{
      tx_hash: string
      tx_output_n: number
      value: number
      spent: boolean
    }>
  } = await res.json()
  return (data.txrefs ?? [])
    .filter((ref) => !ref.spent)
    .map((ref) => ({
      txid: ref.tx_hash,
      vout: ref.tx_output_n,
      value: ref.value,
    }))
}

/**
 * Build and sign a Bitcoin P2WPKH transaction entirely inside the Worker.
 * Fetches UTXOs via the provided Esplora-compatible rpcUrl.
 */
async function signBitcoinTx(
  index: number,
  isTestnet: boolean,
  rpcUrl: string,
  toAddress: string,
  amountSats: number,
  feeRate?: number
): Promise<{ txHex: string; fee: number }> {
  const seed = getSeed()
  try {
    const { btc } = await loadUtxo()
    const network = isTestnet ? btc.networks.testnet : btc.networks.bitcoin
    const signer = await deriveBitcoinSigner(seed, index, isTestnet)
    const { address: fromAddress } = btc.payments.p2wpkh({
      pubkey: Buffer.from(signer.publicKey),
      network,
    })
    if (!fromAddress) throw new Error('Failed to derive sender address')

    const [utxos, resolvedFeeRate] = await Promise.all([
      fetchBitcoinUtxos(rpcUrl, fromAddress),
      feeRate != null ? Promise.resolve(feeRate) : fetchBitcoinFeeRate(rpcUrl),
    ])
    if (!utxos.length) throw new Error('No UTXOs available')

    // Coin selection: accumulate until enough
    const sorted = [...utxos].sort((a, b) => b.value - a.value)
    const selected: Utxo[] = []
    let totalIn = 0
    for (const u of sorted) {
      selected.push(u)
      totalIn += u.value
      if (totalIn >= amountSats + Math.ceil(resolvedFeeRate * 100)) break
    }
    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const outputScript = btc.address.toOutputScript(fromAddress, network)
    const psbt = new btc.Psbt({ network })

    for (const u of selected) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: { script: outputScript, value: BigInt(u.value) },
      })
    }

    psbt.addOutput({ address: toAddress, value: BigInt(amountSats) })

    // Fee estimate: P2WPKH ~68 vBytes/input + ~31 vBytes/output + ~11 overhead
    const outputCount = 2 // assume change
    const vBytesEst = 11 + selected.length * 68 + outputCount * 31
    const feeEst = Math.ceil(resolvedFeeRate * vBytesEst)

    if (totalIn < amountSats + feeEst) {
      const vBytesNoChange = 11 + selected.length * 68 + 1 * 31
      const feeNoChange = Math.ceil(resolvedFeeRate * vBytesNoChange)
      if (totalIn < amountSats + feeNoChange) {
        throw new Error('Insufficient balance to cover amount + fee')
      }
    } else {
      const change = totalIn - amountSats - feeEst
      if (change >= BTC_DUST_THRESHOLD) {
        psbt.addOutput({ address: fromAddress, value: BigInt(change) })
      }
    }

    selected.forEach((_, idx) => psbt.signInput(idx, signer))
    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction()
    const actualFee =
      totalIn - Number(tx.outs.reduce((sum, o) => sum + BigInt(o.value), 0n))

    return { txHex: tx.toHex(), fee: actualFee }
  } finally {
    secureZero(seed)
  }
}

/**
 * Build and sign a Dogecoin P2PKH transaction entirely inside the Worker.
 * Fetches UTXOs via the provided BlockCypher-compatible rpcUrl.
 */
async function signDogecoinTx(
  index: number,
  isTestnet: boolean,
  rpcUrl: string,
  toAddress: string,
  amountSats: number,
  feeRate?: number
): Promise<{ txHex: string; fee: number }> {
  const seed = getSeed()
  try {
    const { btc, tinySecp } = await loadUtxo()
    const network = isTestnet ? DOGECOIN_TESTNET : DOGECOIN_MAINNET
    const signer = await deriveDogecoinSigner(seed, index, isTestnet)
    if (!signer.privateKey) throw new Error('Missing private key')

    const { address: fromAddress } = btc.payments.p2pkh({
      pubkey: signer.publicKey,
      network,
    })
    if (!fromAddress) throw new Error('Failed to derive sender address')

    const utxos = await fetchDogecoinUtxos(rpcUrl, fromAddress)
    if (!utxos.length) throw new Error('No UTXOs available')

    const resolvedFeeRate = feeRate ?? 10 // Dogecoin default: 10 sat/byte

    // Coin selection
    const sorted = [...utxos].sort((a, b) => b.value - a.value)
    const selected: Utxo[] = []
    let totalIn = 0
    for (const u of sorted) {
      selected.push(u)
      totalIn += u.value
      if (totalIn >= amountSats + Math.ceil(resolvedFeeRate * 300)) break
    }
    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const keyPair = {
      publicKey: Buffer.from(signer.publicKey),
      sign: (hash: Uint8Array) =>
        Buffer.from(tinySecp.sign(hash, signer.privateKey!)),
    }

    const tx = new btc.Transaction()
    tx.version = 1

    for (const u of selected) {
      tx.addInput(Buffer.from(u.txid, 'hex').reverse(), u.vout)
    }

    tx.addOutput(
      btc.address.toOutputScript(toAddress, network),
      BigInt(amountSats)
    )

    // P2PKH ~148 bytes/input + ~34 bytes/output + 10 overhead
    const estOutputCount = 2
    const vBytes = 10 + selected.length * 148 + estOutputCount * 34
    const feeEst = Math.ceil(resolvedFeeRate * vBytes)

    if (totalIn < amountSats + feeEst) {
      const vBytesNoChange = 10 + selected.length * 148 + 1 * 34
      const feeNoChange = Math.ceil(resolvedFeeRate * vBytesNoChange)
      if (totalIn < amountSats + feeNoChange) {
        throw new Error('Insufficient balance to cover amount + fee')
      }
    } else {
      const change = totalIn - amountSats - feeEst
      if (change >= DOGE_DUST_THRESHOLD) {
        tx.addOutput(
          btc.address.toOutputScript(fromAddress, network),
          BigInt(change)
        )
      }
    }

    // Sign all inputs (P2PKH)
    for (let i = 0; i < selected.length; i++) {
      const prevOutScript = btc.address.toOutputScript(fromAddress, network)
      const signatureHash = tx.hashForSignature(
        i,
        prevOutScript,
        btc.Transaction.SIGHASH_ALL
      )
      const signature = keyPair.sign(signatureHash)
      const encodedSig = btc.script.signature.encode(
        signature,
        btc.Transaction.SIGHASH_ALL
      )
      tx.setInputScript(i, btc.script.compile([encodedSig, keyPair.publicKey]))
    }

    const txHex = tx.toHex()
    const totalOut = tx.outs.reduce((sum, o) => sum + Number(o.value), 0)
    const actualFee = totalIn - totalOut

    return { txHex, fee: actualFee }
  } finally {
    secureZero(seed)
  }
}

/* ── Address derivation (no private key exposed) ───────────────────────── */

interface DeriveOptions {
  isTestnet?: boolean
  coinType?: number
  addressPrefix?: string
}

async function deriveAddresses(
  family: ChainFamily,
  count: number,
  options?: DeriveOptions
): Promise<
  Array<{
    index: number
    address: string
    path: string
    meta?: Record<string, unknown>
  }>
> {
  const seed = getSeed()
  try {
    switch (family) {
      case ChainFamily.EVM:
      case ChainFamily.Prisma: {
        const seedHex = ethers.hexlify(seed)
        const root = ethers.HDNodeWallet.fromSeed(seedHex)
        const base = "m/44'/60'/0'/0"
        return Array.from({ length: count }, (_, i) => {
          const path = `${base}/${i}`
          const child = root.derivePath(path)
          return { index: i, address: child.address, path }
        })
      }
      case ChainFamily.Solana: {
        return Array.from({ length: count }, (_, i) => {
          const path = `m/44'/501'/${i}'`
          const { key } = derivePath(path, Buffer.from(seed).toString('hex'))
          const kp = Keypair.fromSeed(key.slice(0, 32))
          return { index: i, address: kp.publicKey.toBase58(), path }
        })
      }
      case ChainFamily.Bitcoin: {
        const { btc, bip32Factory, tinySecp } = await loadUtxo()
        const isTestnet = options?.isTestnet ?? false
        const network = isTestnet ? btc.networks.testnet : btc.networks.bitcoin
        const bip32 = bip32Factory(tinySecp)
        const root = bip32.fromSeed(Buffer.from(seed), network)
        return Array.from({ length: count }, (_, i) => {
          const coinType = isTestnet ? 1 : 0
          const path = `m/84'/${coinType}'/0'/0/${i}`
          const child = root.derivePath(path)
          const { address } = btc.payments.p2wpkh({
            pubkey: Buffer.from(child.publicKey),
            network,
          })
          return {
            index: i,
            address: address ?? '',
            path,
            meta: {
              publicKey: ethers.hexlify(Buffer.from(child.publicKey)),
              isTestnet,
            },
          }
        })
      }
      case ChainFamily.Dogecoin: {
        const { btc, bip32Factory, tinySecp } = await loadUtxo()
        const isTestnet = options?.isTestnet ?? false
        const network = isTestnet ? DOGECOIN_TESTNET : DOGECOIN_MAINNET
        const bip32 = bip32Factory(tinySecp)
        const root = bip32.fromSeed(Buffer.from(seed), network)
        const basePath = isTestnet ? "m/44'/1'/0'/0" : "m/44'/3'/0'/0"
        return Array.from({ length: count }, (_, i) => {
          const path = `${basePath}/${i}`
          const child = root.derivePath(path)
          const { address } = btc.payments.p2pkh({
            pubkey: child.publicKey,
            network,
          })
          return {
            index: i,
            address: address ?? '',
            path,
            meta: {
              publicKey: ethers.hexlify(Buffer.from(child.publicKey)),
              isTestnet,
            },
          }
        })
      }
      case ChainFamily.Tron: {
        const seedHex = ethers.hexlify(seed)
        const rootNode = ethers.HDNodeWallet.fromSeed(seedHex)
        const basePath = "m/44'/195'/0'/0"
        return Array.from({ length: count }, (_, i) => {
          const path = `${basePath}/${i}`
          const child = rootNode.derivePath(path)
          const address = publicKeyToTronAddress(child.publicKey)
          return { index: i, address, path }
        })
      }
      case ChainFamily.Cosmos: {
        const { bip32Factory, tinySecp } = await loadUtxo()
        const coinType = options?.coinType ?? 118
        const hrp = options?.addressPrefix ?? 'cosmos'
        const bip32 = bip32Factory(tinySecp)
        const root = bip32.fromSeed(Buffer.from(seed))
        return Array.from({ length: count }, (_, i) => {
          const path = `m/44'/${coinType}'/0'/0/${i}`
          const child = root.derivePath(path)
          const compressedPubKey = child.publicKey
          const sha = ethers.getBytes(ethers.sha256(compressedPubKey))
          const ripemd = ethers.getBytes(ethers.ripemd160(sha))
          const address = bech32Encode(hrp, ripemd)
          return {
            index: i,
            address,
            path,
            meta: {
              publicKey: ethers.hexlify(Buffer.from(compressedPubKey)),
              coinType,
              addressPrefix: hrp,
            },
          }
        })
      }
      default:
        return []
    }
  } finally {
    secureZero(seed)
  }
}

/* ── Message handler ──────────────────────────────────────────────────── */

interface WorkerRequest {
  id: string
  type:
    | 'init'
    | 'init_encrypted'
    | 'get_public_key'
    | 'sign_evm'
    | 'sign_solana'
    | 'sign_bitcoin'
    | 'sign_dogecoin'
    | 'derive_addresses'
    | 'export_seed_encrypted'
    | 'clear'
  payload?: Record<string, unknown>
}

interface WorkerResponse {
  id: string
  type: 'success' | 'error'
  result?: unknown
  error?: string
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data
  const respond = (res: Omit<WorkerResponse, 'id'>) => {
    self.postMessage({ id, ...res } as WorkerResponse)
  }

  try {
    // Ensure ECDH key pair is ready before handling any message
    await initEcdhKeyPair()

    switch (type) {
      case 'get_public_key': {
        if (!ecdhKeyPair) throw new Error('ECDH key pair not initialized')
        const jwk = await exportPublicKeyJwk(ecdhKeyPair.publicKey)
        respond({ type: 'success', result: jwk })
        break
      }

      case 'init': {
        const seed = payload?.seed as number[] | Uint8Array | undefined
        if (!seed) throw new Error('seed required')
        const seedArr = Array.isArray(seed) ? new Uint8Array(seed) : seed
        if (seedArr.length !== 32) throw new Error('seed must be 32 bytes')
        setSeed(seedArr)
        secureZero(seedArr)
        respond({ type: 'success' })
        break
      }

      case 'init_encrypted': {
        const encrypted = payload?.encrypted as EncryptedSeed | undefined
        if (!encrypted || !ecdhKeyPair)
          throw new Error('encrypted seed payload required')
        // Convert serialized types back from postMessage transfer
        const restored: EncryptedSeed = {
          ciphertext:
            encrypted.ciphertext instanceof ArrayBuffer
              ? encrypted.ciphertext
              : new Uint8Array(encrypted.ciphertext as number[]).buffer,
          iv:
            encrypted.iv instanceof Uint8Array
              ? encrypted.iv
              : new Uint8Array(encrypted.iv as number[]),
          ephemeralPublicJwk: encrypted.ephemeralPublicJwk,
        }
        const seed = await decryptSeed(restored, ecdhKeyPair.privateKey)
        try {
          if (seed.length !== 32) throw new Error('seed must be 32 bytes')
          setSeed(seed)
        } finally {
          secureZero(seed)
        }
        respond({ type: 'success' })
        break
      }

      case 'sign_evm': {
        const rawTx = await signEvm(
          Number(payload?.index ?? 0),
          String(payload?.to ?? ''),
          String(payload?.amount ?? ''),
          Number(payload?.chainId ?? 1),
          payload?.rpcUrl ? String(payload.rpcUrl) : null,
          payload?.tokenOpts as
            | { address: string; decimals: number }
            | undefined,
          payload?.data ? String(payload.data) : undefined,
          payload?.gasLimit ? String(payload.gasLimit) : undefined
        )
        respond({ type: 'success', result: rawTx })
        break
      }

      case 'sign_solana': {
        const solRes = await signSolana(
          Number(payload?.index ?? 0),
          String(payload?.to ?? ''),
          Number(payload?.amount ?? 0),
          String(payload?.rpcUrl ?? '')
        )
        respond({
          type: 'success',
          result: {
            serializedTx: Array.from(solRes.serializedTx),
            blockhash: solRes.blockhash,
            lastValidBlockHeight: solRes.lastValidBlockHeight,
          },
        })
        break
      }

      case 'derive_addresses': {
        const family = payload?.family as ChainFamily
        const count = Number(payload?.count ?? 0)
        const opts = payload?.options as DeriveOptions | undefined
        const accounts = await deriveAddresses(family, count, opts)
        respond({ type: 'success', result: accounts })
        break
      }

      case 'sign_bitcoin': {
        const index = Number(payload?.index ?? 0)
        const isTestnet = payload?.isTestnet === true
        const rpcUrl = String(payload?.rpcUrl ?? '')
        const toAddress = String(payload?.toAddress ?? '')
        const amountSats = Number(payload?.amountSats ?? 0)
        const feeRate = payload?.feeRate ? Number(payload.feeRate) : undefined
        const btcResult = await signBitcoinTx(
          index,
          isTestnet,
          rpcUrl,
          toAddress,
          amountSats,
          feeRate
        )
        respond({ type: 'success', result: btcResult })
        break
      }

      case 'sign_dogecoin': {
        const index = Number(payload?.index ?? 0)
        const isTestnet = payload?.isTestnet === true
        const rpcUrl = String(payload?.rpcUrl ?? '')
        const toAddress = String(payload?.toAddress ?? '')
        const amountSats = Number(payload?.amountSats ?? 0)
        const feeRate = payload?.feeRate ? Number(payload.feeRate) : undefined
        const dogeResult = await signDogecoinTx(
          index,
          isTestnet,
          rpcUrl,
          toAddress,
          amountSats,
          feeRate
        )
        respond({ type: 'success', result: dogeResult })
        break
      }

      case 'export_seed_encrypted': {
        // One-time seed export for Passkey registration (user-authorized).
        // Main thread sends its ephemeral public key; Worker encrypts seed with it.
        const requesterPubJwk = payload?.publicKey as JsonWebKey | undefined
        if (!requesterPubJwk)
          throw new Error('publicKey required for seed export')
        const seed = getSeed()
        try {
          const { importPublicKeyJwk } = await import('../utils/seedTransport')
          const requesterPubKey = await importPublicKeyJwk(requesterPubJwk)
          const encrypted = await ecdhEncryptSeed(seed, requesterPubKey)
          respond({
            type: 'success',
            result: {
              ciphertext: Array.from(new Uint8Array(encrypted.ciphertext)),
              iv: Array.from(encrypted.iv),
              ephemeralPublicJwk: encrypted.ephemeralPublicJwk,
            },
          })
        } finally {
          secureZero(seed)
        }
        break
      }

      case 'clear': {
        clearSeed()
        respond({ type: 'success' })
        break
      }

      default:
        respond({ type: 'error', error: `Unknown request type: ${type}` })
    }
  } catch (err) {
    respond({ type: 'error', error: (err as Error).message })
  }
}

export {}
