import { describe, it, expect } from 'vitest'
import {
  bitcoinForkForChain,
  inferBitcoinForkFromRpcUrl,
} from '@/services/rpc/bitcoinService'

// ─── bitcoinForkForChain ────────────────────────────────────────────────

describe('bitcoinForkForChain', () => {
  it('returns explicit bitcoinFork when set', () => {
    expect(
      bitcoinForkForChain({
        id: 'any',
        network: 'testnet',
        bitcoinFork: 'mainnet',
      })
    ).toBe('mainnet')
  })

  it('returns mainnet for network=mainnet', () => {
    expect(
      bitcoinForkForChain({ id: 'bitcoin-mainnet', network: 'mainnet' })
    ).toBe('mainnet')
  })

  it('returns testnet3 for id=bitcoin-testnet3', () => {
    expect(
      bitcoinForkForChain({ id: 'bitcoin-testnet3', network: 'testnet' })
    ).toBe('testnet3')
  })

  it('returns testnet4 for generic testnet', () => {
    expect(
      bitcoinForkForChain({ id: 'bitcoin-testnet4', network: 'testnet' })
    ).toBe('testnet4')
  })

  it('returns regtest for network=regtest', () => {
    expect(
      bitcoinForkForChain({ id: 'bitcoin-regtest', network: 'regtest' })
    ).toBe('regtest')
  })

  it('defaults to mainnet when no hints', () => {
    expect(bitcoinForkForChain({ id: 'unknown' })).toBe('mainnet')
  })
})

// ─── inferBitcoinForkFromRpcUrl ─────────────────────────────────────────

describe('inferBitcoinForkFromRpcUrl', () => {
  const cases: [string, string, string][] = [
    [
      'explicit testnet4 path',
      'https://mempool.space/testnet4/api',
      'testnet4',
    ],
    ['testnet4 in host', 'https://testnet4.example.com', 'testnet4'],
    [
      'blockstream testnet3',
      'https://blockstream.info/testnet/api',
      'testnet3',
    ],
    ['mempool testnet3', 'https://mempool.space/testnet/api', 'testnet3'],
    [
      'alchemy bitcoin-testnet',
      'https://bitcoin-testnet.g.alchemy.com/v2/key',
      'testnet3',
    ],
    ['generic testnet', 'https://some-testnet.example.com', 'testnet4'],
    [
      'local esplora proxy (regtest integration)',
      'http://127.0.0.1:3002',
      'regtest',
    ],
    ['mainnet', 'https://mempool.space/api', 'mainnet'],
    [
      'alchemy mainnet',
      'https://bitcoin-mainnet.g.alchemy.com/v2/key',
      'mainnet',
    ],
  ]

  it.each(cases)('%s → %s', (_label, url, expected) => {
    expect(inferBitcoinForkFromRpcUrl(url)).toBe(expected)
  })
})
