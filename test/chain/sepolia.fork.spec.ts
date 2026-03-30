import { describe, it, expect, beforeAll } from 'vitest'
import { ethers } from 'ethers'
import { getChainProfile } from './chains'
import { fetchChainId, isRpcReachable } from './lib/rpc'

/** Anvil account #0 — public test key, safe for local fork only */
const ANVIL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

const profile = getChainProfile('sepolia')
const rpcUrl =
  process.env.TESTCHAIN_RPC_URL?.trim() ||
  `http://127.0.0.1:${profile.defaultAnvilPort}`

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
    'Optional: TESTCHAIN_RPC_URL=http://127.0.0.1:8546 for custom port',
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
})
