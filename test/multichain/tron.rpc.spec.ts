import { describe, it, expect, beforeAll } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily, type Chain } from '@/models/ChainType'
import type { SignRequest } from '@/services/chainplugins/types'
import '@/services/chainplugins/tron/tronPlugin'
import { KNOWN_MASTER_SEED, skipMultichainIntegration } from './seed'
import {
  fetchTronChainProbe,
  isTronAlchemyMainnetBase,
  resolveTronTestHttpBase,
} from './lib/resolveTestRpc'

const trongridBase = resolveTronTestHttpBase()

async function withTronRpcRetry<T>(
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
    `${label} after retries (${trongridBase}): ${last instanceof Error ? last.message : String(last)}`
  )
}

function tronChainForRpcBase(base: string): Chain {
  if (isTronAlchemyMainnetBase(base)) {
    return {
      id: 'tron-mainnet',
      name: 'TRON Mainnet',
      symbol: 'TRX',
      rpcUrl: [base],
      explorer: 'https://tronscan.org',
      family: ChainFamily.Tron,
    }
  }
  return {
    id: 'tron-shasta',
    name: 'TRON Shasta',
    symbol: 'TRX',
    rpcUrl: [base],
    explorer: 'https://shasta.tronscan.org',
    family: ChainFamily.Tron,
  }
}

describe.skipIf(skipMultichainIntegration)(
  'multichain: Tron (HTTP API + plugin)',
  () => {
    beforeAll(async () => {
      const res = await withTronRpcRetry('Tron probe', () =>
        fetchTronChainProbe(trongridBase)
      )
      if (!res.ok) {
        throw new Error(
          `Tron API not reachable: ${trongridBase} (${res.status}). Set TEST_TRON_API_URL or ALCHEMY_API_KEY, or SKIP_MULTICHAIN_INTEGRATION=1.`
        )
      }
    })

    it('RPC returns chain height (JSON-RPC on Alchemy, /wallet/getnowblock on TronGrid)', async () => {
      const res = await withTronRpcRetry('Tron get height', () =>
        fetchTronChainProbe(trongridBase)
      )
      expect(res.ok).toBe(true)
      const json = (await res.json()) as
        | { result?: string; block_header?: unknown }
        | Record<string, unknown>
      if (isTronAlchemyMainnetBase(trongridBase)) {
        expect(typeof (json as { result?: string }).result).toBe('string')
        expect((json as { result: string }).result).toMatch(/^0x[0-9a-f]+$/i)
      } else {
        expect((json as { block_header?: unknown }).block_header).toBeDefined()
      }
    })

    it('TronChainPlugin derives base58 T addresses (BIP44 195)', () => {
      const plugin = chainRegistry.get(ChainFamily.Tron)
      expect(plugin).toBeDefined()
      const [a0] = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      expect(a0.address.startsWith('T')).toBe(true)
      expect(a0.path).toMatch(/m\/44'\/195'\/0'\/0\/0/)
      expect(plugin!.isValidAddress(a0.address)).toBe(true)
    })

    it('signTransaction is intentionally unimplemented', async () => {
      const plugin = chainRegistry.get(ChainFamily.Tron)!
      const [a0] = plugin.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const req: SignRequest = {
        from: a0.address,
        to: a0.address,
        amount: '0',
        rpcUrl: trongridBase,
        chainConfig: tronChainForRpcBase(trongridBase),
      }
      await expect(plugin.signTransaction(a0.privateKey, req)).rejects.toThrow(
        /not yet implemented/i
      )
    })
  }
)
