/**
 * Isolated signing Worker.
 *
 * This Worker is the ONLY place where:
 *  - masterSeed is stored (XOR-obfuscated)
 *  - HD private keys are derived
 *  - transaction signing happens
 *
 * It NEVER sends privateKey or masterSeed back to the main thread.
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
import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory, type BIP32Interface } from 'bip32'
import * as tinySecp256k1 from 'tiny-secp256k1'
import { ChainFamily } from '../models/ChainType'
import {
  secureZero,
  generateScrambleKey,
  xorScrambleInPlace,
} from '../utils/memoryCrypto'

bitcoin.initEccLib(tinySecp256k1)
const bip32 = BIP32Factory(tinySecp256k1)

/* ── internal state ─────────────────────────────────────────────────────── */

let obfuscatedSeed: Uint8Array | null = null
let scrambleKey: Uint8Array | null = null

/* ── seed lifecycle ───────────────────────────────────────────────────── */

function setSeed(seed: Uint8Array): void {
  if (obfuscatedSeed && scrambleKey) {
    clearSeed()
  }
  scrambleKey = generateScrambleKey()
  obfuscatedSeed = new Uint8Array(seed)
  xorScrambleInPlace(obfuscatedSeed, scrambleKey)
}

function getSeed(): Uint8Array {
  if (!obfuscatedSeed || !scrambleKey) {
    throw new Error('SignerWorker: seed not initialized')
  }
  const seed = new Uint8Array(obfuscatedSeed)
  xorScrambleInPlace(seed, scrambleKey)
  return seed
}

function clearSeed(): void {
  if (obfuscatedSeed) {
    secureZero(obfuscatedSeed)
    obfuscatedSeed = null
  }
  if (scrambleKey) {
    secureZero(scrambleKey)
    scrambleKey = null
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function deriveBitcoinSigner(
  seed: Uint8Array,
  index: number,
  network: bitcoin.Network
): BIP32Interface {
  const root = bip32.fromSeed(Buffer.from(seed), network)
  const isTestnet = network === bitcoin.networks.testnet
  const base = isTestnet ? "m/44'/1'/0'/0" : "m/44'/0'/0'/0"
  return root.derivePath(`${base}/${index}`)
}

/* ── Address derivation (no private key exposed) ───────────────────────── */

function deriveAddresses(
  family: ChainFamily,
  count: number
): Array<{ index: number; address: string; path: string }> {
  const seed = getSeed()
  try {
    switch (family) {
      case ChainFamily.EVM: {
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
        const network = bitcoin.networks.bitcoin
        const bip32 = BIP32Factory(tinySecp256k1)
        const root = bip32.fromSeed(Buffer.from(seed), network)
        return Array.from({ length: count }, (_, i) => {
          const path = `m/84'/0'/0'/0/${i}`
          const child = root.derivePath(path)
          const { address } = bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(child.publicKey),
            network,
          })
          return {
            index: i,
            address: address ?? '',
            path,
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
    | 'sign_evm'
    | 'sign_solana'
    | 'sign_bitcoin'
    | 'derive_addresses'
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
    switch (type) {
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
        const accounts = deriveAddresses(family, count)
        respond({ type: 'success', result: accounts })
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
