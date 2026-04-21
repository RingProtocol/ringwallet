import { describe, it, expect, beforeAll } from 'vitest'
import { ethers } from 'ethers'
import { chainRegistry } from '@/services/chainplugins/registry'
import type { SignRequest } from '@/services/chainplugins/types'
import '@/services/chainplugins/evm/evmPlugin'
import { ChainFamily, type Chain, getPrimaryRpcUrl } from '@/models/ChainType'
import EvmWalletService from '@/services/chainplugins/evm/evmPlugin'
import { getChainProfile } from './chains'
import { fetchChainId, isRpcReachable, rpcCall } from './lib/rpc'

const FORK_MASTER_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

const ANVIL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

const profile = getChainProfile('xlayer')
const rpcUrl =
  process.env.TESTCHAIN_RPC_URL_XLAYER?.trim() ||
  `http://127.0.0.1:${profile.defaultAnvilPort}`

function localChain(): Chain {
  return {
    id: profile.chainId,
    name: profile.displayName,
    symbol: 'OKB',
    rpcUrl: [rpcUrl],
    explorer: 'https://www.oklink.com/xlayer',
    family: ChainFamily.EVM,
  }
}

async function expectTxMined(
  provider: ethers.JsonRpcProvider,
  txHash: string,
  context: string
): Promise<ethers.TransactionReceipt> {
  const deadline = Date.now() + 8_000
  while (Date.now() < deadline) {
    const tx = await provider.getTransaction(txHash)
    if (tx) {
      const receipt = await tx.wait()
      if (receipt) return receipt
      throw new Error(`${context}: tx.wait() returned null for ${txHash}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(
    `${context}: ${txHash} never appeared via eth_getTransaction (~8s). ` +
      'Broadcast likely failed and a simulated hash was returned; check Anvil/RPC logs.'
  )
}

function localHint(): string {
  return [
    `RPC not reachable at ${rpcUrl}`,
    '',
    'Start a fresh local Anvil (one terminal):',
    `  anvil --chain-id ${profile.chainId} --port ${profile.defaultAnvilPort} --silent`,
    '',
    'Or run yarn test:prepare to start all local chains at once.',
    'Override port: TESTCHAIN_RPC_URL_XLAYER=http://127.0.0.1:<port>',
  ].join('\n')
}

describe(`testchain: ${profile.id} (${profile.displayName})`, () => {
  beforeAll(async () => {
    const up = await isRpcReachable(rpcUrl)
    if (!up) throw new Error(localHint())
    const id = await fetchChainId(rpcUrl)
    if (id !== profile.chainId) {
      throw new Error(
        `Expected chainId ${profile.chainId}, got ${id}.\n` +
          `Run: anvil --chain-id ${profile.chainId} --port ${profile.defaultAnvilPort}`
      )
    }
  })

  it('exposes expected chainId on RPC', async () => {
    expect(await fetchChainId(rpcUrl)).toBe(profile.chainId)
  })

  it('rpcCall eth_chainId matches profile (JSON-RPC helper)', async () => {
    const hex = await rpcCall<string>(rpcUrl, 'eth_chainId', [])
    expect(Number.parseInt(hex, 16)).toBe(profile.chainId)
  })

  it('latest block has number, hash, and parentHash fields', async () => {
    const block = await rpcCall<{
      number: string
      hash: string
      parentHash: string
    }>(rpcUrl, 'eth_getBlockByNumber', ['latest', false])
    expect(Number.parseInt(block.number, 16)).toBeGreaterThanOrEqual(0)
    expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
    expect(block.parentHash).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })

  it('eth_gasPrice returns a positive wei amount', async () => {
    const hex = await rpcCall<string>(rpcUrl, 'eth_gasPrice', [])
    expect(BigInt(hex)).toBeGreaterThan(0n)
  })

  it('Anvil dev account #0 has a large balance', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const bal = await provider.getBalance(wallet.address)
    expect(bal).toBeGreaterThan(ethers.parseEther('1000'))
  })

  it('mined tx uses sequential nonce and advances count', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const latestBefore = await provider.getTransactionCount(
      wallet.address,
      'latest'
    )
    const tx = await wallet.sendTransaction({ to: wallet.address, value: 0n })
    expect(tx.nonce).toBe(latestBefore)
    const receipt = await tx.wait()
    expect(receipt?.status).toBe(1)
  })

  it('can submit a native transfer from Anvil dev account', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const tx = await wallet.sendTransaction({ to: wallet.address, value: 1n })
    const receipt = await tx.wait()
    expect(receipt?.status).toBe(1)
    expect(tx.hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })

  describe('src/ services on local X Layer (Anvil)', () => {
    it('getPrimaryRpcUrl resolves the local HTTP endpoint from Chain', () => {
      expect(getPrimaryRpcUrl(localChain())).toBe(rpcUrl)
    })

    it('EvmChainPlugin: derive masterSeed → sign EIP-1559 tx → broadcast', async () => {
      const plugin = chainRegistry.get(ChainFamily.EVM)
      expect(plugin).toBeDefined()
      const [derived] = plugin!.deriveAccounts(FORK_MASTER_SEED, 1)
      expect(derived.path).toBe("m/44'/60'/0'/0/0")
      expect(plugin!.isValidAddress(derived.address)).toBe(true)

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const funder = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
      const fundReceipt = await (
        await funder.sendTransaction({
          to: derived.address,
          value: ethers.parseEther('0.2'),
        })
      ).wait()
      expect(fundReceipt?.status).toBe(1)

      const req: SignRequest = {
        from: derived.address,
        to: derived.address,
        amount: '0.0001',
        rpcUrl,
        chainConfig: localChain(),
      }
      const signed = await plugin!.signTransaction(derived.privateKey, req)
      expect(signed.rawTx.startsWith('0x')).toBe(true)
      const txHash = await plugin!.broadcastTransaction(signed, rpcUrl)
      const receipt = await expectTxMined(
        provider,
        txHash,
        'EvmChainPlugin.broadcast'
      )
      expect(receipt.status).toBe(1)
    })

    it('EvmWalletService: signTransaction + broadcastEOATransaction', async () => {
      const plugin = chainRegistry.get(ChainFamily.EVM)!
      const derived = plugin.deriveAccounts(FORK_MASTER_SEED, 2)[1]

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const funder = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
      const fundReceipt = await (
        await funder.sendTransaction({
          to: derived.address,
          value: ethers.parseEther('0.2'),
        })
      ).wait()
      expect(fundReceipt?.status).toBe(1)

      const signed = await EvmWalletService.signTransaction(
        derived.privateKey,
        derived.address,
        '0.00005',
        profile.chainId,
        rpcUrl
      )
      const txHash = await EvmWalletService.broadcastEOATransaction(
        signed,
        rpcUrl
      )
      const receipt = await expectTxMined(
        provider,
        txHash,
        'EvmWalletService.broadcastEOA'
      )
      expect(receipt.status).toBe(1)
    })
  })
})
