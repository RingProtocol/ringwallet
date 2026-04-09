import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import { skipMultichainIntegration } from './seed'
import { ensureTestEnv, tryGetAlchemyApiKey } from '../evmchain/lib/env'
import EvmRpcService from '@/services/rpc/evmRpcService'
import { tronAddressToHex } from '@/services/chainplugins/tron/tronPlugin'
import '@/services/chainplugins/tron/tronPlugin'

ensureTestEnv()

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error(
    `${label} after retries: ${last instanceof Error ? last.message : String(last)}`
  )
}

// RPC resolvers — public RPCs first (no origin whitelist), Alchemy as bonus

function resolveEvmRpcUrls(): string[] {
  const explicit = process.env.TEST_EVM_RPC_URL?.trim()
  if (explicit) return [explicit]
  const urls = [
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth',
    'https://1rpc.io/eth',
  ]
  const key = tryGetAlchemyApiKey()
  if (key) urls.unshift(`https://eth-mainnet.g.alchemy.com/v2/${key}`)
  return urls
}

function resolveSolanaRpcUrls(): string[] {
  const explicit = process.env.TEST_SOLANA_RPC_URL?.trim()
  if (explicit) return [explicit]
  const urls = [
    'https://solana.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ]
  const key = tryGetAlchemyApiKey()
  if (key) urls.unshift(`https://solana-mainnet.g.alchemy.com/v2/${key}`)
  return urls
}

function resolveTronJsonRpcUrls(): string[] {
  const explicit = process.env.TEST_TRON_API_URL?.trim()
  if (explicit) return [explicit]
  const urls = ['https://api.trongrid.io/jsonrpc']
  const key = tryGetAlchemyApiKey()
  if (key) urls.unshift(`https://tron-mainnet.g.alchemy.com/v2/${key}`)
  return urls
}

function resolveCosmosRestBase(): string {
  const explicit = process.env.TEST_COSMOS_RPC_URL?.trim()
  if (explicit) return explicit
  return 'https://cosmos-rest.publicnode.com'
}

// ── EVM balance ──

const evmTestAddress = process.env.EVM_BALANCE_TEST_ADDRESS?.trim()

describe.skipIf(skipMultichainIntegration || !evmTestAddress)(
  'balance: EVM (known funded address)',
  () => {
    it(`balance > 0 for ${evmTestAddress}`, async () => {
      const service = new EvmRpcService(resolveEvmRpcUrls())
      const balance = await withRetry('EVM getBalance', () =>
        service.getBalance(evmTestAddress!)
      )
      expect(balance).toBeGreaterThan(0n)
      console.log(
        `  EVM balance: ${ethers.formatEther(balance)} ETH (${evmTestAddress})`
      )
    })
  }
)

// ── Solana balance ──

const solanaTestAddress = process.env.SOLANA_BALANCE_TEST_ADDRESS?.trim()

describe.skipIf(skipMultichainIntegration || !solanaTestAddress)(
  'balance: Solana (known funded address)',
  () => {
    it(`balance > 0 for ${solanaTestAddress}`, async () => {
      const rpcUrls = resolveSolanaRpcUrls()
      const pk = new PublicKey(solanaTestAddress!)

      let lamports: number | undefined
      let lastError: unknown
      for (const rpcUrl of rpcUrls) {
        try {
          const connection = new Connection(rpcUrl, 'confirmed')
          lamports = await withRetry('Solana getBalance', () =>
            connection.getBalance(pk)
          )
          break
        } catch (e) {
          lastError = e
        }
      }

      if (lamports === undefined) {
        throw lastError instanceof Error
          ? lastError
          : new Error('All Solana RPCs failed')
      }

      const balance = lamports / 1e9
      expect(balance).toBeGreaterThan(0)
      console.log(
        `  Solana balance: ${balance.toFixed(4)} SOL (${solanaTestAddress})`
      )
    })
  }
)

// ── Tron balance ──

const tronTestAddress = process.env.TRON_BALANCE_TEST_ADDRESS?.trim()

describe.skipIf(skipMultichainIntegration || !tronTestAddress)(
  'balance: Tron (known funded address)',
  () => {
    it(`balance > 0 for ${tronTestAddress}`, async () => {
      const hexAddr = tronAddressToHex(tronTestAddress!)
      const rpcUrls = resolveTronJsonRpcUrls()

      let balance: bigint | undefined
      let lastError: unknown
      for (const rpcUrl of rpcUrls) {
        try {
          balance = await withRetry('Tron getBalance', async () => {
            const res = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getBalance',
                params: [hexAddr, 'latest'],
              }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = (await res.json()) as {
              result?: string
              error?: { message: string }
            }
            if (json.error) throw new Error(json.error.message)
            return BigInt(json.result ?? '0x0')
          })
          break
        } catch (e) {
          lastError = e
        }
      }

      if (balance === undefined) {
        throw lastError instanceof Error
          ? lastError
          : new Error('All Tron RPCs failed')
      }

      expect(balance).toBeGreaterThan(0n)

      // TronGrid /jsonrpc eth_getBalance returns sun scaled to 18 digits
      const formatted = ethers.formatEther(balance)
      console.log(
        `  Tron balance: ${formatted} TRX (${tronTestAddress} → ${hexAddr})`
      )
    })
  }
)

// ── Cosmos balance ──

const cosmosTestAddress = process.env.COSMOS_BALANCE_TEST_ADDRESS?.trim()

describe.skipIf(skipMultichainIntegration || !cosmosTestAddress)(
  'balance: Cosmos (known funded address)',
  () => {
    it(`balance query succeeds for ${cosmosTestAddress}`, async () => {
      const restBase = resolveCosmosRestBase()
      const res = await withRetry('Cosmos balances', async () => {
        const r = await fetch(
          `${restBase.replace(/\/$/, '')}/cosmos/bank/v1beta1/balances/${cosmosTestAddress}`
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r
      })

      const json = (await res.json()) as {
        balances?: Array<{ denom: string; amount: string }>
      }
      expect(json.balances).toBeDefined()
      expect(Array.isArray(json.balances)).toBe(true)

      const totalAmount = (json.balances ?? []).reduce(
        (sum, b) => sum + BigInt(b.amount || '0'),
        0n
      )
      // Cosmos test address may have 0 balance; the RPC query itself is the test
      expect(totalAmount).toBeGreaterThanOrEqual(0n)

      const uatom = json.balances?.find((b) => b.denom === 'uatom')
      console.log(
        `  Cosmos balance: ${uatom ? (Number(uatom.amount) / 1e6).toFixed(6) : '0'} ATOM (${cosmosTestAddress})`
      )
    })
  }
)
