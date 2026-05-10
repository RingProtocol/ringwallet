import { POLYMARKET_SUBGRAPHS } from './constants'
import { POSITIONS_QUERY, ORDERS_QUERY } from './queries/positions'

export interface SubgraphPosition {
  id: string
  market: {
    id: string
    question: string
    conditionId: string
    outcomePrices: string
    outcomes: string
    slug: string
    image: string
  }
  outcomeIndex: number
  quantity: string
  avgPrice: string
  updatedAt: string
}

export interface SubgraphOrder {
  id: string
  market: {
    id: string
    question: string
    slug: string
  }
  outcomeIndex: number
  side: string
  makerAmount: string
  takerAmount: string
  price: string
  status: string
  transactionHash: string
  timestamp: string
}

async function fetchSubgraph<T>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    throw new Error(`Subgraph error: HTTP ${res.status}`)
  }
  const json = await res.json()
  if (json.errors) {
    throw new Error(
      `Subgraph error: ${json.errors.map((e: Error) => e.message).join(', ')}`
    )
  }
  return json.data as T
}

export async function fetchPositions(
  walletAddress: string
): Promise<SubgraphPosition[]> {
  const data = await fetchSubgraph<{
    userPositions: SubgraphPosition[]
  }>(POLYMARKET_SUBGRAPHS.positions, POSITIONS_QUERY, {
    address: walletAddress.toLowerCase(),
  })
  return data.userPositions ?? []
}

export async function fetchOrders(
  walletAddress: string
): Promise<SubgraphOrder[]> {
  const data = await fetchSubgraph<{
    orders: SubgraphOrder[]
  }>(POLYMARKET_SUBGRAPHS.activity, ORDERS_QUERY, {
    address: walletAddress.toLowerCase(),
  })
  return data.orders ?? []
}
