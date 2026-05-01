import { formatUnits } from 'ethers'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { chainToAccountAssetsNetwork, DEFAULT_CHAINS } from '@/config/chains'
import {
  chainTokenPositionUsd,
  fetchAccountBalances,
  formatUsdAmount,
} from '@/features/balance/balanceManager'
import type { ChainToken } from '@/models/ChainTokens'
import {
  clearChainTokenCache,
  getTokensForNetwork,
  getTotalUsdForNetwork,
} from '@/models/ChainTokens'
import { ChainFamily, type Chain } from '@/models/ChainType'
import { buildAccountAssetsApi2MockBody } from './api2MockTokens'

import { ACCOUNT_ASSETS_URL } from '@/server/urls'

const TEST_WALLET = '0x9fe8b07ac19eae1f3548d8379a534070a89ee620'
// yarn vitest run test/unit/features/balance/balanceManager.test.ts

function stubEvmChain(id: number, name: string, symbol: string): Chain {
  return {
    id,
    name,
    symbol,
    family: ChainFamily.EVM,
    rpcUrl: ['http://127.0.0.1:8545'],
    explorer: 'https://example.com',
  }
}

/** Mirrors `sumUsdAcrossTokens` in balanceManager (displayDecimals 18). */
function sumUsdAcrossTokensLikeManager(tokens: ChainToken[]): number {
  let total = 0
  for (const t of tokens) {
    const decimals =
      (t.tokenMetadata?.decimals ?? null) != null
        ? t.tokenMetadata.decimals!
        : 18
    const qtyStr = formatTokenQuantity(t.tokenBalance, decimals, 18)
    const qtyNum = Number(qtyStr)
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) continue
    const p = t.tokenPrices?.find((x) => x.currency?.toLowerCase() === 'usd')
    const unit = p ? Number(p.value) : 0
    if (!Number.isFinite(unit) || unit <= 0) continue
    total += qtyNum * unit
  }
  return total
}

function formatTokenQuantity(
  balanceHex: string,
  decimals: number,
  displayDecimals: number
): string {
  try {
    const raw = BigInt(balanceHex)
    const qty = formatUnits(raw, decimals)
    const num = Number(qty)
    if (!Number.isFinite(num)) return '0'
    return num.toFixed(displayDecimals)
  } catch {
    return '0'
  }
}

describe('balanceManager.fetchAccountBalances', () => {
  const portfolioChains = [
    stubEvmChain(1, 'Ethereum Mainnet', 'ETH'),
    stubEvmChain(11155111, 'Sepolia Testnet', 'ETH'),
    stubEvmChain(8453, 'Base', 'ETH'),
    stubEvmChain(56, 'BNB Smart Chain', 'BNB'),
  ]

  const portfolioNetworkSlugs = portfolioChains.map(
    (c) => chainToAccountAssetsNetwork(c) ?? ''
  )

  beforeEach(() => {
    clearChainTokenCache()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url !== ACCOUNT_ASSETS_URL) {
          return new Response('not mocked', { status: 404 })
        }
        return new Response(buildAccountAssetsApi2MockBody(TEST_WALLET), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearChainTokenCache()
  })

  it('POSTs account_assets with address + networks, then returns balances matching mocked portfolio', async () => {
    const activeChain = portfolioChains[1] // Sepolia → eth-sepolia

    const result = await fetchAccountBalances(
      TEST_WALLET,
      activeChain,
      portfolioNetworkSlugs
    )
    expect(result).not.toBeNull()
    if (!result) throw new Error('Expected non-null balances result')

    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      ACCOUNT_ASSETS_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      addresses: [
        {
          address: TEST_WALLET,
          networks: portfolioNetworkSlugs,
        },
      ],
    })

    const tokens: ChainToken[] = JSON.parse(
      buildAccountAssetsApi2MockBody(TEST_WALLET)
    ).data.tokens

    const expectedTotalUsd = sumUsdAcrossTokensLikeManager(tokens)
    const sepoliaTokens = tokens.filter((t) => t.network === 'eth-sepolia')
    const expectedSepoliaUsd = sumUsdAcrossTokensLikeManager(sepoliaTokens)

    expect(result.totalAssetUsd).toBe(formatUsdAmount(expectedTotalUsd))
    expect(result.currentChainUsd).toBe(formatUsdAmount(expectedSepoliaUsd))

    const nativeSepolia = sepoliaTokens.find((t) => t.tokenAddress == null)!
    const nativeQty = formatTokenQuantity(nativeSepolia.tokenBalance, 18, 4)
    expect(result.nativeBalance).toBe(nativeQty)
  })

  it('after fetchAccountBalances, ChainTokens maps match api2.md-derived cache and per-network USD', async () => {
    const activeChain = portfolioChains[0] // mainnet

    await fetchAccountBalances(TEST_WALLET, activeChain, portfolioNetworkSlugs)

    const tokens: ChainToken[] = JSON.parse(
      buildAccountAssetsApi2MockBody(TEST_WALLET)
    ).data.tokens

    const byNet = new Map<string, ChainToken[]>()
    for (const t of tokens) {
      const list = byNet.get(t.network) ?? []
      list.push(t)
      byNet.set(t.network, list)
    }

    for (const [network, list] of byNet) {
      const cached = getTokensForNetwork(network)
      expect(cached, `tokens for ${network}`).toBeDefined()
      expect(cached).toHaveLength(list.length)
      expect(cached?.map((t) => t.tokenBalance)).toEqual(
        list.map((t) => t.tokenBalance)
      )

      const expectedUsd = sumUsdAcrossTokensLikeManager(list)
      expect(getTotalUsdForNetwork(network)).toBe(formatUsdAmount(expectedUsd))
    }
  })

  it('normalizes native rows: null tokenMetadata, inferred decimals/symbol; empty testnet prices', async () => {
    const sepolia = DEFAULT_CHAINS.find((c) => c.id === 11155111)
    expect(sepolia).toBeDefined()
    if (!sepolia) throw new Error('Sepolia missing from DEFAULT_CHAINS')

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          data: {
            tokens: [
              {
                address: TEST_WALLET.toLowerCase(),
                network: 'eth-sepolia',
                tokenAddress: null,
                tokenBalance:
                  '0x0000000000000000000000000000000000000000000000000000000000000001',
                tokenMetadata: null,
                tokenPrices: [],
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    await fetchAccountBalances(TEST_WALLET, sepolia, ['eth-sepolia'])

    const cached = getTokensForNetwork('eth-sepolia')
    expect(cached).toBeDefined()
    const native = cached!.find((t) => t.tokenAddress == null)
    expect(native?.tokenMetadata.decimals).toBe(18)
    expect(native?.tokenMetadata.symbol).toBe(sepolia.symbol)
    expect(native?.tokenMetadata.name).toBe(sepolia.name)
    expect(native?.tokenPrices).toEqual([])
    expect(chainTokenPositionUsd(native!)).toBe(0)
  })
})
