import { beforeEach, describe, expect, it, vi } from 'vitest'

const historyMocks = vi.hoisted(() => ({
  mockGetCorsHeaders: vi.fn(),
  mockGetHistory: vi.fn(),
  mockIsOriginAllowed: vi.fn(),
  mockValidateAddress: vi.fn(),
}))

vi.mock('@/server/history', () => ({
  getCorsHeaders: historyMocks.mockGetCorsHeaders,
  getHistory: historyMocks.mockGetHistory,
  isOriginAllowed: historyMocks.mockIsOriginAllowed,
  validateAddress: historyMocks.mockValidateAddress,
}))

import { GET, OPTIONS } from '../../app/api/v1/history/route'

describe('/api/v1/history route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    historyMocks.mockGetCorsHeaders.mockReturnValue({ 'access-control-allow-origin': 'http://localhost:3003' })
    historyMocks.mockIsOriginAllowed.mockReturnValue(true)
    historyMocks.mockValidateAddress.mockReturnValue(true)
    historyMocks.mockGetHistory.mockResolvedValue({
      transactions: [
        {
          hash: '0xabc',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          value: '1.23',
          timestamp: 1710000000,
          status: 'confirmed',
        },
      ],
    })
  })

  it('returns CORS headers for preflight', async () => {
    const response = await OPTIONS(new Request('http://localhost:3000/api/v1/history', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3003',
      },
    }))

    expect(response.status).toBe(204)
    expect(historyMocks.mockIsOriginAllowed).toHaveBeenCalledWith('http://localhost:3003')
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3003')
  })

  it('fetches history payload for a valid request', async () => {
    const response = await GET(new Request(
      'http://localhost:3000/api/v1/history?address=0x1111111111111111111111111111111111111111&chainId=1&limit=8&pending=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      {
        headers: {
          origin: 'http://localhost:3003',
        },
      },
    ))

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(historyMocks.mockIsOriginAllowed).toHaveBeenCalledWith('http://localhost:3003')
    expect(historyMocks.mockValidateAddress).toHaveBeenCalled()
    expect(historyMocks.mockGetHistory).toHaveBeenCalledWith({
      address: '0x1111111111111111111111111111111111111111',
      chainId: '1',
      limit: 8,
      pendingHashes: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    })
    expect(payload).toEqual({
      transactions: [
        {
          hash: '0xabc',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          value: '1.23',
          timestamp: 1710000000,
          status: 'confirmed',
        },
      ],
    })
  })
})
