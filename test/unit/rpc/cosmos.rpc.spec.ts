import { describe, it, expect, beforeAll } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/cosmos/cosmosPlugin'
import { KNOWN_MASTER_SEED, skipMultichainIntegration } from './seed'

function resolveCosmosTestRpcUrl(): string {
  const explicit = process.env.TEST_COSMOS_RPC_URL?.trim()
  if (explicit) return explicit
  return 'https://cosmos-rest.publicnode.com'
}

const restBase = resolveCosmosTestRpcUrl()

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
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error(
    `${label} after retries (${restBase}): ${last instanceof Error ? last.message : String(last)}`
  )
}

describe.skipIf(skipMultichainIntegration)(
  'multichain: Cosmos (REST API + plugin)',
  () => {
    beforeAll(async () => {
      const res = await fetch(
        `${restBase}/cosmos/base/tendermint/v1beta1/blocks/latest`
      )
      if (!res.ok) {
        throw new Error(
          `Cosmos REST not reachable: ${restBase} (${res.status}). ` +
            'Set TEST_COSMOS_RPC_URL or SKIP_MULTICHAIN_INTEGRATION=1.'
        )
      }
    })

    it('latest block has a positive height', async () => {
      const res = await withRpcRetry('latestBlock', async () => {
        const r = await fetch(
          `${restBase}/cosmos/base/tendermint/v1beta1/blocks/latest`
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r
      })
      const json = (await res.json()) as {
        block?: { header?: { height?: string } }
      }
      const height = Number.parseInt(json.block?.header?.height ?? '0', 10)
      expect(height).toBeGreaterThan(0)
    })

    it('CosmosChainPlugin derives bech32 cosmos1 addresses', () => {
      const plugin = chainRegistry.get(ChainFamily.Cosmos)
      expect(plugin).toBeDefined()
      const [a0] = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      expect(a0.address).toMatch(/^cosmos1[a-z0-9]{38}$/)
      expect(a0.path).toMatch(/m\/44'\/118'/)
      expect(plugin!.isValidAddress(a0.address)).toBe(true)
    })

    it('balance query returns a result for derived address', async () => {
      const plugin = chainRegistry.get(ChainFamily.Cosmos)!
      const [a0] = plugin.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const res = await withRpcRetry('balances', async () => {
        const r = await fetch(
          `${restBase}/cosmos/bank/v1beta1/balances/${a0.address}`
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r
      })
      const json = (await res.json()) as { balances?: unknown[] }
      expect(json.balances).toBeDefined()
      expect(Array.isArray(json.balances)).toBe(true)
    })
  }
)
