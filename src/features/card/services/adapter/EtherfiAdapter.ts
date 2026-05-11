import { MemoryBackedCardAdapter } from './memoryBackedCardAdapter'

/**
 * Ether.fi Cash integration. Uses the same in-memory session model as the
 * dev mock until the Ether.fi Cash API is wired; registry id matches
 * CARD_PROVIDERS (`etherfi`). The card lets users spend staked ETH and
 * stablecoins, hence the broader asset list and the EU/APAC/Americas region
 * coverage advertised on the provider's marketing site.
 */
export const etherfiAdapter = new MemoryBackedCardAdapter({
  id: 'etherfi',
  displayName: 'Ether.fi Cash',
  supportedAssets: ['ETH', 'weETH', 'eETH', 'USDC', 'USDT', 'DAI'],
  supportedChains: ['ethereum', 'arbitrum', 'base', 'optimism'],
  supportedCurrencies: ['USD', 'EUR', 'GBP'],
  supportedRegions: ['EU', 'APAC', 'Americas'],
  cardTypes: ['virtual', 'physical'],
})
