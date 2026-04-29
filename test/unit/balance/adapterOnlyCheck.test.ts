import { describe, it, expect } from 'vitest'
import { DEFAULT_CHAINS } from '../../../src/config/chains'
import { usesAdapterOnlyAccountAssetsSync } from '../../../src/features/balance/balanceManager'

describe('usesAdapterOnlyAccountAssetsSync', () => {
  it('returns true for Fantom (not in chains-api-supported.json)', () => {
    const fantom = DEFAULT_CHAINS.find((c) => c.name === 'Fantom')!
    expect(usesAdapterOnlyAccountAssetsSync(fantom)).toBe(true)
  })

  it('returns true for Fantom Testnet (not in chains-api-supported.json)', () => {
    const fantomTestnet = DEFAULT_CHAINS.find(
      (c) => c.name === 'Fantom Testnet'
    )!
    expect(usesAdapterOnlyAccountAssetsSync(fantomTestnet)).toBe(true)
  })

  it('returns true for Cosmos Hub (hardcoded adapter-only family)', () => {
    const cosmos = DEFAULT_CHAINS.find((c) => c.name === 'Cosmos Hub')!
    expect(usesAdapterOnlyAccountAssetsSync(cosmos)).toBe(true)
  })

  it('returns true for Dogecoin (not in chains-api-supported.json)', () => {
    const doge = DEFAULT_CHAINS.find((c) => c.name === 'Dogecoin')!
    expect(usesAdapterOnlyAccountAssetsSync(doge)).toBe(true)
  })

  it('returns true for Dogecoin Testnet (not in chains-api-supported.json)', () => {
    const dogeTestnet = DEFAULT_CHAINS.find(
      (c) => c.name === 'Dogecoin Testnet'
    )!
    expect(usesAdapterOnlyAccountAssetsSync(dogeTestnet)).toBe(true)
  })

  it('returns false for Ethereum Mainnet (in chains-api-supported.json)', () => {
    const eth = DEFAULT_CHAINS.find((c) => c.name === 'Ethereum Mainnet')!
    expect(usesAdapterOnlyAccountAssetsSync(eth)).toBe(false)
  })

  it('returns false for Base Mainnet (in chains-api-supported.json)', () => {
    const base = DEFAULT_CHAINS.find((c) => c.name === 'Base')!
    expect(usesAdapterOnlyAccountAssetsSync(base)).toBe(false)
  })
})
