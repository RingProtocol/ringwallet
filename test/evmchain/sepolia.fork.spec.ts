import { describe, it, expect, beforeAll } from 'vitest'
import { ethers } from 'ethers'
import { chainRegistry } from '@/services/chainplugins/registry'
import type { SignRequest } from '@/services/chainplugins/types'
import '@/services/chainplugins/evm/evmPlugin'
import { ChainFamily, type Chain, getPrimaryRpcUrl } from '@/models/ChainType'
import EvmWalletService from '@/services/chainplugins/evm/evmPlugin'
import { getChainProfile } from './chains'
import { fetchChainId, isRpcReachable, rpcCall } from './lib/rpc'

/** Same 32-byte seed as `src/services/chainplugins/registry.test.ts` — deterministic addresses */
const FORK_MASTER_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

/** Anvil account #0 — public test key, safe for local fork only */
const ANVIL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

const profile = getChainProfile('sepolia')
const rpcUrl =
  process.env.TESTCHAIN_RPC_URL?.trim() ||
  `http://127.0.0.1:${profile.defaultAnvilPort}`

function sepoliaForkChain(): Chain {
  return {
    id: profile.chainId,
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    rpcUrl: [rpcUrl],
    explorer: 'https://sepolia.etherscan.io',
    family: ChainFamily.EVM,
  }
}

/**
 * `EvmChainPlugin.broadcastTransaction` / `EvmWalletService.broadcastEOATransaction`
 * return `keccak256(rawTx)` on RPC failure without rethrowing. That hash is a real tx id
 * shape but the tx was never submitted — `waitForTransaction` then blocks until Vitest's
 * testTimeout (looks "stuck"). Poll `eth_getTransaction` first and fail fast with a
 * clear message.
 */
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

function forkHint(): string {
  let url = '<run: yarn test:chain fork-url>'
  try {
    url = profile.buildForkRpcUrl()
  } catch {
    // no key in env — still show generic steps
  }
  return [
    `RPC not reachable at ${rpcUrl}`,
    '',
    'Prepare Anvil (one terminal):',
    `  anvil --fork-url "${url}" --port ${profile.defaultAnvilPort}`,
    '',
    'Or: yarn test:chain fork-url   then paste into anvil',
    'Optional: TESTCHAIN_RPC_URL=http://127.0.0.1:<port> if Anvil is not on default 8545',
  ].join('\n')
}

describe(`testchain: ${profile.id} (${profile.displayName})`, () => {
  beforeAll(async () => {
    const up = await isRpcReachable(rpcUrl)
    if (!up) {
      throw new Error(forkHint())
    }
    const id = await fetchChainId(rpcUrl)
    if (id !== profile.chainId) {
      const hint =
        id === 31337
          ? `RPC at ${rpcUrl} looks like plain Anvil (31337), not a Sepolia fork.\nRestart with:\n  yarn test:chain:fork-url\n  anvil --fork-url "<paste-url>" --port ${profile.defaultAnvilPort}\nOr run yarn test:chain:wait-anvil before yarn test:chain.`
          : `Expected chainId ${profile.chainId}, got ${id}. Point TESTCHAIN_RPC_URL at a Sepolia anvil --fork-url.`
      throw new Error(hint)
    }
  })

  it('exposes expected chainId on RPC', async () => {
    expect(await fetchChainId(rpcUrl)).toBe(profile.chainId)
  })

  it('rpcCall eth_chainId matches profile (JSON-RPC helper)', async () => {
    const hex = await rpcCall<string>(rpcUrl, 'eth_chainId', [])
    expect(Number.parseInt(hex, 16)).toBe(profile.chainId)
  })

  it('buildForkRpcUrl returns an HTTP(S) fork URL (env / CLI wiring)', () => {
    const url = profile.buildForkRpcUrl()
    expect(url).toMatch(/^https?:\/\//)
    expect(url.length).toBeGreaterThan(10)
  })

  it('latest block has number, hash, and base fee fields', async () => {
    const block = await rpcCall<{
      number: string
      hash: string
      parentHash: string
      baseFeePerGas?: string
    }>(rpcUrl, 'eth_getBlockByNumber', ['latest', false])
    expect(Number.parseInt(block.number, 16)).toBeGreaterThan(0)
    expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
    expect(block.parentHash).toMatch(/^0x[a-fA-F0-9]{64}$/)
    if (block.baseFeePerGas != null) {
      expect(BigInt(block.baseFeePerGas)).toBeGreaterThan(0n)
    }
  })

  it('eth_gasPrice returns a positive wei amount', async () => {
    const hex = await rpcCall<string>(rpcUrl, 'eth_gasPrice', [])
    expect(BigInt(hex)).toBeGreaterThan(0n)
  })

  it('Anvil dev account #0 has a large ETH balance on the fork', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const bal = await provider.getBalance(wallet.address)
    expect(bal).toBeGreaterThan(ethers.parseEther('1000'))
  })

  it('mined tx uses sequential nonce and advances count at that block', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const latestBefore = await provider.getTransactionCount(
      wallet.address,
      'latest'
    )
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
    })
    expect(tx.nonce).toBe(latestBefore)
    const receipt = await tx.wait()
    expect(receipt?.status).toBe(1)
    const blockHex = ethers.toBeHex(receipt!.blockNumber)
    const countAtMinedBlock = await rpcCall<string>(
      rpcUrl,
      'eth_getTransactionCount',
      [wallet.address, blockHex]
    )
    expect(Number.parseInt(countAtMinedBlock, 16)).toBe(latestBefore + 1)
  })

  it('can submit a native transfer from Anvil dev account', async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 1n,
    })
    const receipt = await tx.wait()
    expect(receipt?.status).toBe(1)
    expect(tx.hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })

  it('reads Sepolia USDC balanceOf via eth_call (fork state)', async () => {
    const usdc = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    const iface = new ethers.Interface([
      'function balanceOf(address account) view returns (uint256)',
    ])
    const data = iface.encodeFunctionData('balanceOf', [
      '0x0000000000000000000000000000000000000001',
    ])
    const raw = await rpcCall<string>(rpcUrl, 'eth_call', [
      { to: usdc, data },
      'latest',
    ])
    const [balance] = iface.decodeFunctionResult('balanceOf', raw)
    expect(balance).toBeGreaterThanOrEqual(0n)
  })

  describe('src/ services on forked Sepolia (Anvil)', () => {
    it('getPrimaryRpcUrl resolves the fork HTTP endpoint from Chain', () => {
      expect(getPrimaryRpcUrl(sepoliaForkChain())).toBe(rpcUrl)
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

      const chainConfig = sepoliaForkChain()
      const req: SignRequest = {
        from: derived.address,
        to: derived.address,
        amount: '0.0001',
        rpcUrl,
        chainConfig,
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

    it('EvmWalletService: signTransaction + broadcastEOATransaction on fork', async () => {
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
