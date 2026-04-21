import { describe, it, expect, beforeAll } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import '@/services/chainplugins/cosmos/cosmosPlugin'
import { ChainFamily } from '@/models/ChainType'
import { KNOWN_MASTER_SEED } from '../seed'

// Tendermint RPC endpoint for Cosmos Hub testnet (theta-testnet-001)
const cosmosRpcUrl =
  process.env.TEST_COSMOS_RPC_URL?.trim() ||
  'https://cosmos-testnet-rpc.polkachu.com'
// Cosmos REST (LCD) for balance queries
const cosmosRestUrl =
  process.env.TEST_COSMOS_REST_URL?.trim() ||
  'https://cosmos-testnet-api.polkachu.com'

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

async function getAtomBalance(
  restUrl: string,
  address: string
): Promise<bigint> {
  const res = await fetch(
    `${restUrl}/cosmos/bank/v1beta1/balances/${address}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  const json = await res.json()
  const uatom = (
    json.balances as Array<{ denom: string; amount: string }> | undefined
  )?.find((b) => b.denom === 'uatom')
  return BigInt(uatom?.amount ?? '0')
}

// ─── 1. Offline derivation — always runs ────────────────────────────────────

describe('CosmosPlugin: Cosmos Hub offline derivation', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)

  it('plugin is registered', () => {
    expect(plugin).toBeDefined()
    expect(plugin!.family).toBe(ChainFamily.Cosmos)
  })

  it('derives 2 accounts with cosmos1 address prefix', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    expect(accounts).toHaveLength(2)
    expect(accounts[0].address).toMatch(/^cosmos1[a-z0-9]+$/)
    expect(accounts[1].address).toMatch(/^cosmos1[a-z0-9]+$/)
    expect(accounts[0].address).not.toBe(accounts[1].address)
  })

  it('validates derived Cosmos Hub addresses', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 2, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    expect(plugin!.isValidAddress(accounts[0].address)).toBe(true)
    expect(plugin!.isValidAddress(accounts[1].address)).toBe(true)
  })

  it('derivation is deterministic', () => {
    const a1 = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    const a2 = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    expect(a1[0].address).toBe(a2[0].address)
    expect(a1[0].privateKey).toBe(a2[0].privateKey)
  })

  it('derived account carries coinType and addressPrefix in meta', () => {
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    expect(accounts[0].meta?.coinType).toBe(118)
    expect(accounts[0].meta?.addressPrefix).toBe('cosmos')
  })

  it('rejects invalid bech32 addresses', () => {
    expect(plugin!.isValidAddress('')).toBe(false)
    expect(plugin!.isValidAddress('not-an-address')).toBe(false)
    expect(plugin!.isValidAddress('cosmos1')).toBe(false)
  })
})

// ─── 2. Optional RPC connectivity — skip if offline ─────────────────────────

describe('Cosmos Hub testnet: Tendermint RPC reachability', () => {
  let reachable = false

  beforeAll(async () => {
    reachable = await isTendermintReachable(cosmosRpcUrl)
    if (!reachable) {
      console.warn(
        `[cosmos] Tendermint RPC not reachable at ${cosmosRpcUrl} — skipping network tests`
      )
    }
  })

  it('GET /status returns node_info with network field', async () => {
    if (!reachable) return
    const res = await fetch(`${cosmosRpcUrl}/status`)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(typeof json.result.node_info.network).toBe('string')
    expect(json.result.node_info.network.length).toBeGreaterThan(0)
  })

  it('latest block height is a positive integer', async () => {
    if (!reachable) return
    const res = await fetch(`${cosmosRpcUrl}/status`)
    const json = await res.json()
    const height = parseInt(json.result.sync_info.latest_block_height, 10)
    expect(height).toBeGreaterThan(0)
  })

  it('derived cosmos1 address returns a balance (0 or more uatom)', async () => {
    if (!reachable) return
    const plugin = chainRegistry.get(ChainFamily.Cosmos)
    const accounts = plugin!.deriveAccounts(KNOWN_MASTER_SEED, 1, {
      coinType: 118,
      addressPrefix: 'cosmos',
    })
    const balance = await getAtomBalance(cosmosRestUrl, accounts[0].address)
    expect(balance).toBeGreaterThanOrEqual(0n)
  })
})
