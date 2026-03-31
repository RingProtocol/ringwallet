import { describe, it, expect, beforeAll } from 'vitest'
import { Connection, PublicKey } from '@solana/web3.js'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/solana/solanaPlugin'
import { KNOWN_MASTER_SEED, skipMultichainIntegration } from './seed'
import { resolveSolanaTestRpcUrl } from './lib/resolveTestRpc'

const rpcUrl = resolveSolanaTestRpcUrl()

async function withRpcRetry<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  let last: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }
  throw new Error(
    `${label} after retries (${rpcUrl}): ${last instanceof Error ? last.message : String(last)}`
  )
}

describe.skipIf(skipMultichainIntegration)(
  'multichain: Solana (public RPC)',
  () => {
    let connection: Connection

    beforeAll(() => {
      connection = new Connection(rpcUrl, 'confirmed')
    })

    it('RPC returns a recent blockhash', async () => {
      const { blockhash } = await withRpcRetry('getLatestBlockhash', () =>
        connection.getLatestBlockhash('confirmed')
      )
      expect(blockhash.length).toBeGreaterThan(30)
    })

    it('SolanaChainPlugin derives SLIP-0010 paths and valid base58 addresses', () => {
      const plugin = chainRegistry.get(ChainFamily.Solana)
      expect(plugin).toBeDefined()
      const [a0] = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      expect(a0.path).toMatch(/m\/44'\/501'\/0'\/0'/)
      expect(plugin!.isValidAddress(a0.address)).toBe(true)
      expect(() => new PublicKey(a0.address)).not.toThrow()
    })

    it('getBalance returns a number for derived address', async () => {
      const plugin = chainRegistry.get(ChainFamily.Solana)!
      const [a0] = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const pk = new PublicKey(a0.address)
      const lamports = await withRpcRetry('getBalance', () =>
        connection.getBalance(pk)
      )
      expect(typeof lamports).toBe('number')
      expect(lamports).toBeGreaterThanOrEqual(0)
    })
  }
)
