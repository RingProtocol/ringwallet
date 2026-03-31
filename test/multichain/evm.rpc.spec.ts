import { describe, it, expect, beforeAll } from 'vitest'
import { ethers } from 'ethers'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/evm/evmPlugin'
import { KNOWN_MASTER_SEED, skipMultichainIntegration } from './seed'

function resolveEvmTestRpcUrl(): string {
  const explicit = process.env.TEST_EVM_RPC_URL?.trim()
  if (explicit) return explicit
  return 'https://eth.llamarpc.com'
}

const rpcUrl = resolveEvmTestRpcUrl()

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
  'multichain: EVM (public RPC)',
  () => {
    let provider: ethers.JsonRpcProvider

    beforeAll(() => {
      provider = new ethers.JsonRpcProvider(rpcUrl)
    })

    it('RPC returns a recent block number', async () => {
      const blockNumber = await withRpcRetry('getBlockNumber', () =>
        provider.getBlockNumber()
      )
      expect(blockNumber).toBeGreaterThan(0)
    })

    it('eth_chainId returns a positive chain ID', async () => {
      const network = await withRpcRetry('getNetwork', () =>
        provider.getNetwork()
      )
      expect(Number(network.chainId)).toBeGreaterThan(0)
    })

    it('EvmChainPlugin derives BIP44 paths and valid 0x addresses', () => {
      const plugin = chainRegistry.get(ChainFamily.EVM)
      expect(plugin).toBeDefined()
      const [a0] = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      expect(a0.path).toBe("m/44'/60'/0'/0/0")
      expect(plugin!.isValidAddress(a0.address)).toBe(true)
      expect(a0.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('getBalance returns a bigint >= 0 for derived address', async () => {
      const plugin = chainRegistry.get(ChainFamily.EVM)!
      const [a0] = plugin.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const balance = await withRpcRetry('getBalance', () =>
        provider.getBalance(a0.address)
      )
      expect(typeof balance).toBe('bigint')
      expect(balance).toBeGreaterThanOrEqual(0n)
    })

    it('eth_gasPrice returns a positive value', async () => {
      const feeData = await withRpcRetry('getFeeData', () =>
        provider.getFeeData()
      )
      expect(feeData.gasPrice).not.toBeNull()
      expect(feeData.gasPrice!).toBeGreaterThan(0n)
    })
  }
)
