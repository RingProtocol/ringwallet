import { describe, it, expect } from 'vitest'
import { DEFAULT_CHAINS } from '../../../src/config/chains'
import { usesAdapterOnlyAccountAssetsSync } from '../../../src/features/balance/balanceManager'

describe('usesAdapterOnlyAccountAssetsSync', () => {
  it('returns true for Fantom (in unsupported-api-assets.json)', () => {
    const fantom = DEFAULT_CHAINS.find((c) => c.name === 'Fantom')!
    expect(usesAdapterOnlyAccountAssetsSync(fantom)).toBe(true)
  })

  it('returns true for Fantom Testnet (in unsupported-api-assets.json)', () => {
    const fantomTestnet = DEFAULT_CHAINS.find(
      (c) => c.name === 'Fantom Testnet'
    )!
    expect(usesAdapterOnlyAccountAssetsSync(fantomTestnet)).toBe(true)
  })

  it('returns true for Cosmos Hub (hardcoded adapter-only family)', () => {
    const cosmos = DEFAULT_CHAINS.find((c) => c.name === 'Cosmos Hub')!
    expect(usesAdapterOnlyAccountAssetsSync(cosmos)).toBe(true)
  })

  it('returns true for Dogecoin (in unsupported-api-assets.json)', () => {
    const doge = DEFAULT_CHAINS.find((c) => c.name === 'Dogecoin')!
    expect(usesAdapterOnlyAccountAssetsSync(doge)).toBe(true)
  })

  it('returns true for Dogecoin Testnet (in unsupported-api-assets.json)', () => {
    const dogeTestnet = DEFAULT_CHAINS.find(
      (c) => c.name === 'Dogecoin Testnet'
    )!
    expect(usesAdapterOnlyAccountAssetsSync(dogeTestnet)).toBe(true)
  })

  it('returns false for Ethereum Mainnet (not in unsupported-api-assets.json)', () => {
    const eth = DEFAULT_CHAINS.find((c) => c.name === 'Ethereum Mainnet')!
    expect(usesAdapterOnlyAccountAssetsSync(eth)).toBe(false)
  })

  it('returns false for Base Mainnet (not in unsupported-api-assets.json)', () => {
    const base = DEFAULT_CHAINS.find((c) => c.name === 'Base')!
    expect(usesAdapterOnlyAccountAssetsSync(base)).toBe(false)
  })
})
