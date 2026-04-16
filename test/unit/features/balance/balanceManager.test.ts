import { formatUnits } from 'ethers'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { chainToAccountAssetsNetwork } from '@/config/chains'
import {
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

const ACCOUNT_ASSETS_URL = 'https://rw.testring.org/v1/account_assets'

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
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      address: TEST_WALLET,
      networks: portfolioNetworkSlugs,
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
})
