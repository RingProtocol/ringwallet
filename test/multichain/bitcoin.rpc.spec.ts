import { describe, it, expect, beforeAll } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/bitcoin/bitcoinPlugin'
import { KNOWN_MASTER_SEED, skipMultichainIntegration } from './seed'
import {
  fetchBitcoinTipHeight,
  resolveBitcoinTipProbe,
  type BitcoinTipProbe,
} from './lib/resolveTestRpc'

describe.skipIf(skipMultichainIntegration)(
  'multichain: Bitcoin (tip probe + plugin)',
  () => {
    let probe: BitcoinTipProbe

    beforeAll(async () => {
      probe = resolveBitcoinTipProbe()
      try {
        const height = await fetchBitcoinTipHeight(probe)
        if (height <= 0) {
          throw new Error(`unexpected tip height ${height}`)
        }
      } catch (e) {
        const hint =
          probe.kind === 'esplora'
            ? `Set TEST_BITCOIN_INDEXER_URL or ensure Esplora base is reachable (${probe.baseUrl}).`
            : `Alchemy Bitcoin JSON-RPC failed (${probe.rpcUrl}).`
        const err = new Error(
          `${hint} ${e instanceof Error ? e.message : String(e)}`
        )
        ;(err as Error & { cause?: unknown }).cause = e
        throw err
      }
    })

    it('chain tip height is positive', async () => {
      const height = await fetchBitcoinTipHeight(probe)
      expect(height).toBeGreaterThan(0)
    })

    it('BitcoinChainPlugin derives native segwit mainnet (bc1) and testnet (tb1)', () => {
      const plugin = chainRegistry.get(ChainFamily.Bitcoin)
      expect(plugin).toBeDefined()
      const main = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const test = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
        isTestnet: true,
      })
      expect(main[0].address).toMatch(/^bc1q/)
      expect(test[0].address).toMatch(/^tb1q/)
      expect(plugin!.isValidAddress(main[0].address)).toBe(true)
      expect(plugin!.isValidAddress(test[0].address)).toBe(true)
      expect(main[0].path).toMatch(/m\/44'\/0'/)
      expect(test[0].path).toMatch(/m\/44'\/1'/)
    })
  }
)
