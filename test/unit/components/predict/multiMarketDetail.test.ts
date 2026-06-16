import { describe, it, expect } from 'vitest'
import PolymarketDetailPage, {
  type PolymarketMarketDetail,
} from '../../../../src/components/predict/PolymarketDetailPage'
import PolymarketBettingPanel from '../../../../src/components/predict/PolymarketBettingPanel'

describe('Predict multi-market detail — structural', () => {
  it('PolymarketDetailPage is exported as a React component function', () => {
    expect(typeof PolymarketDetailPage).toBe('function')
    expect(PolymarketDetailPage.name).toBe('PolymarketDetailPage')
  })

  it('PolymarketBettingPanel is exported as a React component function', () => {
    expect(typeof PolymarketBettingPanel).toBe('function')
    expect(PolymarketBettingPanel.name).toBe('PolymarketBettingPanel')
  })

  it('PolymarketMarketDetail accepts a multi-market detail payload (compile-time check)', () => {
    const detail: PolymarketMarketDetail = {
      question: 'World Cup Winner',
      slug: 'world-cup-winner',
      image: 'https://example.com/world-cup.png',
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
      marketCount: 3,
      markets: [
        {
          id: '558934',
          slug: 'will-spain-win',
          question: 'Will Spain win the 2026 FIFA World Cup?',
          volume: 500000,
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.16","0.84"]',
          active: true,
          closed: false,
        },
        {
          id: '558935',
          slug: 'will-brazil-win',
          question: 'Will Brazil win the 2026 FIFA World Cup?',
          volume: 300000,
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.12","0.88"]',
          active: true,
          closed: false,
        },
        {
          id: '558936',
          slug: 'will-argentina-win',
          question: 'Will Argentina win the 2026 FIFA World Cup?',
          volume: 200000,
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.10","0.90"]',
          active: true,
          closed: false,
        },
      ],
    }

    expect(detail.marketCount).toBe(3)
    expect(detail.markets).toHaveLength(3)
    expect(detail.markets?.[0]?.slug).toBe('will-spain-win')
  })

  it('PolymarketMarketDetail is also valid for a single-market event (compile-time check)', () => {
    const detail: PolymarketMarketDetail = {
      question: 'Will Bitcoin reach 200k?',
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
    }

    // No `markets` / `marketCount` — the page should fall back to the
    // existing single-market Yes/No flow.
    expect(detail.marketCount).toBeUndefined()
    expect(detail.markets).toBeUndefined()
  })
})
