export const POSITIONS_QUERY = `
  query Positions($address: String!) {
    userPositions(where: { user: $address }) {
      id
      market {
        id
        question
        conditionId
        outcomePrices
        outcomes
        slug
        image
      }
      outcomeIndex
      quantity
      avgPrice
      updatedAt
    }
  }
` as const

export const ORDERS_QUERY = `
  query Orders($address: String!) {
    orders(
      where: { maker: $address }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      market {
        id
        question
        slug
      }
      outcomeIndex
      side
      makerAmount
      takerAmount
      price
      status
      transactionHash
      timestamp
    }
  }
` as const

export const MARKET_TOKENS_QUERY = `
  query MarketTokens($conditionId: String!) {
    condition(id: $conditionId) {
      id
      outcomeSlotCount
      outcomeCollection {
        id
        indexSet
        position {
          id
          tokenId
        }
      }
    }
  }
` as const
