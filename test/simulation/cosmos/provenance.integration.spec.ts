import { describe, it, expect, beforeAll } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import '@/services/chainplugins/cosmos/cosmosPlugin'
import { ChainFamily } from '@/models/ChainType'
import { KNOWN_MASTER_SEED } from '../seed'

// Tendermint RPC for Provenance testnet
const provenanceTestnetRpcUrl =
  process.env.TEST_PROVENANCE_RPC_URL?.trim() ||
  'https://rpc.test.provenance.io'
// REST (LCD) for Provenance testnet
const provenanceTestnetRestUrl =
  process.env.TEST_PROVENANCE_REST_URL?.trim() ||
  'https://api.test.provenance.io'

async function isTendermintReachable(rpcUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${rpcUrl}/status`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return false
    const json = await res.json()
    return typeof json?.result?.sync_info?.latest_block_height === 'string'
  } catch {
    return false
  }
}

async function getNhashBalance(
  restUrl: string,
  address: string
): Promise<bigint> {
  const res = await fetch(
    `${restUrl}/cosmos/bank/v1beta1/balances/${address}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  const json = await res.json()
  const nhash = (
    json.balances as Array<{ denom: string; amount: string }> | undefined
  )?.find((b) => b.denom === 'nhash')
  return BigInt(nhash?.amount ?? '0')
}

// ─── 1. Offline derivation — always runs ────────────────────────────────────

describe('CosmosPlugin: Provenance mainnet offline derivation', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)

  it('derives 2 accounts with pb1 address prefix (coinType 505)', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(accounts).toHaveLength(2)
    expect(accounts[0].address).toMatch(/^pb1[a-z0-9]+$/)
    expect(accounts[1].address).toMatch(/^pb1[a-z0-9]+$/)
    expect(accounts[0].address).not.toBe(accounts[1].address)
  })

  it('validates derived pb1 addresses', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(plugin!.isValidAddress(accounts[0].address)).toBe(true)
    expect(plugin!.isValidAddress(accounts[1].address)).toBe(true)
  })

  it('derivation is deterministic (coinType 505)', () => {
    const a1 = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    const a2 = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(a1[0].address).toBe(a2[0].address)
  })

  it('Provenance pb1 address differs from Cosmos cosmos1 address (different coinType)', () => {
    const cosmos = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    const prov = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    // Different coinType → different key → different address payload
    expect(prov[0].address).not.toBe(cosmos[0].address)
    expect(prov[0].privateKey).not.toBe(cosmos[0].privateKey)
  })

  it('derived account carries coinType 505 and addressPrefix pb in meta', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(accounts[0].meta?.coinType).toBe(505)
    expect(accounts[0].meta?.addressPrefix).toBe('pb')
  })
})

describe('CosmosPlugin: Provenance testnet offline derivation', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)

  it('derives 2 accounts with tp1 address prefix (coinType 1)', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 1,
      addressPrefix: 'tp',
    })
    expect(accounts).toHaveLength(2)
    expect(accounts[0].address).toMatch(/^tp1[a-z0-9]+$/)
    expect(accounts[1].address).toMatch(/^tp1[a-z0-9]+$/)
  })

  it('validates derived tp1 addresses', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 1,
      addressPrefix: 'tp',
    })
    expect(plugin!.isValidAddress(accounts[0].address)).toBe(true)
    expect(plugin!.isValidAddress(accounts[1].address)).toBe(true)
  })
})

// ─── 2. Optional RPC connectivity — skip if offline ─────────────────────────

describe('Provenance testnet: Tendermint RPC reachability', () => {
  let reachable = false

  beforeAll(async () => {
    reachable = await isTendermintReachable(provenanceTestnetRpcUrl)
    if (!reachable) {
      console.warn(
        `[provenance] Tendermint RPC not reachable at ${provenanceTestnetRpcUrl} — skipping network tests`
      )
    }
  })

  it('GET /status returns node_info with network field', async () => {
    if (!reachable) return
    const res = await fetch(`${provenanceTestnetRpcUrl}/status`)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(typeof json.result.node_info.network).toBe('string')
    expect(json.result.node_info.network.length).toBeGreaterThan(0)
  })

  it('latest block height is a positive integer', async () => {
    if (!reachable) return
    const res = await fetch(`${provenanceTestnetRpcUrl}/status`)
    const json = await res.json()
    const height = parseInt(json.result.sync_info.latest_block_height, 10)
    expect(height).toBeGreaterThan(0)
  })

  it('derived tp1 address returns a balance (0 or more nhash)', async () => {
    if (!reachable) return
    const plugin = chainRegistry.get(ChainFamily.Cosmos)
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 1,
      addressPrefix: 'tp',
    })
    const balance = await getNhashBalance(
      provenanceTestnetRestUrl,
      accounts[0].address
    )
    expect(balance).toBeGreaterThanOrEqual(0n)
  })
})
