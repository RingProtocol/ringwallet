export interface CardProvider {
  id: string
  name: string
  description: string
  url: string
  icon: string
  regions: string[]
}

export const CARD_PROVIDERS: CardProvider[] = [
  {
    id: 'immersve',
    name: 'Immersve',
    description: 'DeFi-native Visa card, spend directly from your wallet',
    url: 'https://immersve.com',
    icon: '/assets/cards/immersve.png',
    regions: ['Global'],
  },
  {
    id: 'etherfi',
    name: 'Ether.fi Cash',
    description: 'Spend your staked ETH and stablecoins worldwide',
    url: 'https://cash.ether.fi',
    icon: '/assets/cards/etherfi.png',
    regions: ['EU', 'APAC', 'Americas'],
  },
  {
    id: 'holyheld',
    name: 'Holyheld',
    description: 'Crypto to Visa instantly, zero hassle',
    url: 'https://holyheld.com',
    icon: '/assets/cards/holyheld.png',
    regions: ['EU'],
  },
  {
    id: 'baanx',
    name: 'Baanx',
    description: 'Multi-currency crypto card with Apple Pay support',
    url: 'https://baanx.com',
    icon: '/assets/cards/baanx.png',
    regions: ['EU', 'UK', 'Global'],
  },
  {
    id: 'reap',
    name: 'Reap',
    description: 'Crypto-powered Visa for Asia Pacific',
    url: 'https://reap.co',
    icon: '/assets/cards/reap.png',
    regions: ['APAC', 'HK'],
  },
]
