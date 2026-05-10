import { MemoryBackedCardAdapter } from './memoryBackedCardAdapter'

/**
 * Immersve card integration. Uses the same in-memory session model as the
 * dev mock until the Immersve API is wired; registry id matches CARD_PROVIDERS.
 */
export const immersveAdapter = new MemoryBackedCardAdapter({
  id: 'immersve',
  displayName: 'Immersve',
  supportedAssets: ['USDC', 'ETH', 'USDT', 'DAI'],
  supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  supportedCurrencies: ['USD', 'EUR', 'GBP'],
  supportedRegions: ['Global'],
  cardTypes: ['virtual', 'physical'],
})
