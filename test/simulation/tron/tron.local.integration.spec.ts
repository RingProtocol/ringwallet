import { describe, it, expect, beforeAll } from 'vitest'
import { ethers } from 'ethers'
import { chainRegistry } from '@/services/chainplugins/registry'
import '@/services/chainplugins/tron/tronPlugin'
import { ChainFamily } from '@/models/ChainType'
import { tronAddressToHex } from '@/services/chainplugins/tron/tronPlugin'
import { KNOWN_MASTER_SEED } from '../seed'

/** Anvil account #0 — public test key, safe for local Anvil only */
const ANVIL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

const TRON_ANVIL_PORT = 8547
const rpcUrl =
  process.env.TEST_TRON_RPC_URL?.trim() || `http://127.0.0.1:${TRON_ANVIL_PORT}`

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await res.json()
  if (json.error)
    throw new Error(json.error.message ?? JSON.stringify(json.error))
  return json.result as T
}

async function isRpcReachable(url: string): Promise<boolean> {
  try {
    const result = await rpcCall<string>(url, 'eth_chainId', [])
    return !!result
  } catch {
    return false
  }
}

async function getBalance(url: string, address: string): Promise<bigint> {
  const hex = await rpcCall<string>(url, 'eth_getBalance', [address, 'latest'])
  return BigInt(hex)
}

describe.skipIf(process.env.SKIP_TRON_LOCAL === '1')(
  'multichain: Tron local Anvil (transfer + balance)',
  () => {
    let plugin: ReturnType<typeof chainRegistry.get>
    let provider: ethers.JsonRpcProvider

    beforeAll(async () => {
      const up = await isRpcReachable(rpcUrl)
      if (!up) {
        throw new Error(
          [
            `Tron Anvil RPC not reachable at ${rpcUrl}`,
            '',
            'Start a local Anvil (one terminal):',
            `  anvil --chain-id 728126428 --port ${TRON_ANVIL_PORT}`,
            '',
            'Or run: yarn test:prepare',
          ].join('\n')
        )
      }

      plugin = chainRegistry.get(ChainFamily.Tron)
      expect(plugin).toBeDefined()

      provider = new ethers.JsonRpcProvider(rpcUrl)
    })

    it('derives Tron addresses from master seed with T-prefix', () => {
      const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2)
      expect(accounts).toHaveLength(2)
      expect(accounts[0].address).toMatch(/^T/)
      expect(accounts[1].address).toMatch(/^T/)
      expect(plugin!.isValidAddress(accounts[0].address)).toBe(true)
      expect(plugin!.isValidAddress(accounts[1].address)).toBe(true)
    })

    it('tronAddressToHex converts T-address to matching EVM address', () => {
      const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1)
      const hex = tronAddressToHex(accounts[0].address)
      expect(hex).toMatch(/^0x[a-fA-F0-9]{40}$/)
      // Verify hex matches the EVM address derived from the same private key
      const evmAddr = ethers.computeAddress(accounts[0].privateKey)
      expect(hex.toLowerCase()).toBe(evmAddr.toLowerCase())
    })

    it('transfers native TRX and verifies balance change', async () => {
      const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2)
      const senderTron = accounts[0]
      const receiverTron = accounts[1]

      const senderHex = tronAddressToHex(senderTron.address)
      const receiverHex = tronAddressToHex(receiverTron.address)

      // Fund sender from Anvil dev account
      const funder = new ethers.Wallet(ANVIL_DEV_PRIVATE_KEY, provider)
      const fundTx = await funder.sendTransaction({
        to: senderHex,
        value: ethers.parseEther('10'),
      })
      await fundTx.wait()

      // Read balances before transfer
      const senderBalBefore = await getBalance(rpcUrl, senderHex)
      const balBefore = await getBalance(rpcUrl, receiverHex)

      // Transfer 2 TRX from sender to receiver using derived private key
      const sendAmount = ethers.parseEther('2')
      const senderWallet = new ethers.Wallet(senderTron.privateKey, provider)
      const tx = await senderWallet.sendTransaction({
        to: receiverHex,
        value: sendAmount,
      })
      const receipt = await tx.wait()
      expect(receipt?.status).toBe(1)

      // Read receiver balance after transfer (raw RPC to avoid provider caching)
      const balAfter = await getBalance(rpcUrl, receiverHex)
      console.log(
        `[tron] receiver before: ${balBefore}, after: ${balAfter}, diff: ${balAfter - balBefore}`
      )
      expect(balAfter - balBefore).toBe(sendAmount)

      // Verify sender balance decreased by at least the send amount (+ gas)
      const senderBalAfter = await getBalance(rpcUrl, senderHex)
      expect(senderBalBefore - senderBalAfter).toBeGreaterThanOrEqual(
        sendAmount
      )
    })
  }
)
