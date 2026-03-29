import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getHistory } from './history'

const ORIGINAL_ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const ORIGINAL_ETHERSCAN_API_BASE_URL = process.env.ETHERSCAN_API_BASE_URL

describe('getHistory', () => {
  beforeEach(() => {
    process.env.ETHERSCAN_API_KEY = 'test-api-key'
    process.env.ETHERSCAN_API_BASE_URL = 'https://api.etherscan.io/v2/api'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    if (ORIGINAL_ETHERSCAN_API_KEY === undefined) {
      delete process.env.ETHERSCAN_API_KEY
    } else {
      process.env.ETHERSCAN_API_KEY = ORIGINAL_ETHERSCAN_API_KEY
    }

    if (ORIGINAL_ETHERSCAN_API_BASE_URL === undefined) {
      delete process.env.ETHERSCAN_API_BASE_URL
    } else {
      process.env.ETHERSCAN_API_BASE_URL = ORIGINAL_ETHERSCAN_API_BASE_URL
    }
  })

  it('merges normal transactions with ERC20 transfers for the same address', async () => {
    const address = '0x1111111111111111111111111111111111111111'
    const txHash =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input))
      const action = url.searchParams.get('action')

      if (action === 'txlist') {
        return new Response(
          JSON.stringify({
            status: '1',
            message: 'OK',
            result: [
              {
                hash: txHash,
                from: '0x2222222222222222222222222222222222222222',
                to: address,
                value: '1000000000000000000',
                timeStamp: '1710000000',
                isError: '0',
                txreceipt_status: '1',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      if (action === 'tokentx') {
        return new Response(
          JSON.stringify({
            status: '1',
            message: 'OK',
            result: [
              {
                hash: txHash,
                from: '0x2222222222222222222222222222222222222222',
                to: address,
                value: '2500000',
                timeStamp: '1710000001',
                isError: '0',
                txreceipt_status: '1',
                contractAddress: '0x3333333333333333333333333333333333333333',
                tokenName: 'Mock USD',
                tokenSymbol: 'mUSD',
                tokenDecimal: '6',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      throw new Error(`Unexpected action: ${action}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    const payload = await getHistory({
      address,
      chainId: '11155111',
      limit: 8,
      pendingHashes: [],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(payload.source).toBe('etherscan')
    expect(payload.transactions).toHaveLength(2)

    expect(payload.transactions).toEqual([
      expect.objectContaining({
        id: `${txHash}:0x3333333333333333333333333333333333333333:0x2222222222222222222222222222222222222222:${address}:2500000`,
        hash: txHash,
        assetType: 'token',
        assetName: 'Mock USD',
        assetSymbol: 'mUSD',
        assetAddress: '0x3333333333333333333333333333333333333333',
        value: '2.5',
      }),
      expect.objectContaining({
        id: txHash,
        hash: txHash,
        assetType: 'native',
        assetName: 'Sepolia Testnet',
        assetSymbol: 'SepoliaETH',
        value: '1',
      }),
    ])
  })
})
