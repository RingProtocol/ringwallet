import React, { useState, useCallback } from 'react'
import { POLYMARKET_GAMMA_API } from '../../services/polymarket/constants'
import {
  formatPolymarketVolume,
  type PolymarketMarket,
} from '../../services/polymarketService'
import './PolymarketListPage.css'

// ─── Test page entry via URL hash: #/predict-test ───
// QuickActionBar predict button routes to PolymarketListPage normally.
// To open this test page manually, navigate to: window.location.hash = '#/predict-test'

interface ApiTestResult {
  source: string
  url: string
  markets: PolymarketMarket[]
  error: string | null
  duration: number
}

interface RawGammaMarket {
  id: string | number
  question: string
  slug: string
  image?: string
  volume24hr?: string | number
  volume?: string | number
  outcomes?: string
  outcomePrices?: string
  volumeNum?: number
  volume24hrNum?: number
  liquidityNum?: number
  active?: boolean
  closed?: boolean
  category?: string
}

interface RawGammaEvent {
  id: string
  title?: string
  slug?: string
  image?: string
  volume24hr?: number
  volume?: number
  liquidity?: number
  category?: string
  subcategory?: string
  markets?: RawGammaMarket[]
}

function normalizeGammaMarket(raw: RawGammaMarket): PolymarketMarket {
  return {
    id: raw.id,
    question: raw.question,
    slug: raw.slug,
    image: raw.image || '',
    volume24hr: String(raw.volume24hr ?? raw.volume24hrNum ?? '0'),
    volume: String(raw.volume ?? raw.volumeNum ?? '0'),
    outcomes: raw.outcomes || '[]',
    outcomePrices: raw.outcomePrices || '[]',
  }
}

function eventToMarket(ev: RawGammaEvent): PolymarketMarket | null {
  const markets = ev.markets ?? []
  if (markets.length === 0) return null
  const rep = markets.find((m) => m.active !== false) ?? markets[0]
  return {
    id: rep.id,
    question: ev.title || rep.question,
    slug: ev.slug || rep.slug,
    image: ev.image || rep.image || '',
    volume24hr: String(rep.volume24hr ?? rep.volumeNum ?? '0'),
    volume: String(rep.volume ?? rep.volumeNum ?? '0'),
    outcomes: rep.outcomes || '[]',
    outcomePrices: rep.outcomePrices || '[]',
    eventVolume24hr: ev.volume24hr,
    eventVolume: ev.volume,
    eventLiquidity: ev.liquidity,
    category: ev.category,
    subcategory: ev.subcategory,
  }
}

async function fetchViaProxy(
  limit: number,
  offset: number,
  category?: string
): Promise<ApiTestResult> {
  const start = performance.now()
  const body: Record<string, unknown> = {
    source: 'polymarket',
    active: true,
    closed: false,
    limit,
    offset,
    order: 'volume_24hr',
    ascending: false,
  }
  if (category) body.category = category

  try {
    const res = await fetch('https://wapi.testring.org/v1/prediction_markets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': import.meta.env.VITE_SERVER_API_KEY,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    const markets = (json.data ?? []).map((m: RawGammaMarket) =>
      normalizeGammaMarket(m)
    )
    return {
      source: 'Proxy (wapi.testring.org)',
      url: 'POST /v1/prediction_markets',
      markets,
      error: null,
      duration: performance.now() - start,
    }
  } catch (err) {
    return {
      source: 'Proxy (wapi.testring.org)',
      url: 'POST /v1/prediction_markets',
      markets: [],
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    }
  }
}

async function fetchGammaMarketsDirect(
  limit: number,
  offset: number,
  order: string,
  category?: string
): Promise<ApiTestResult> {
  const start = performance.now()
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    archived: 'false',
    limit: String(limit),
    offset: String(offset),
    order,
    ascending: 'false',
  })
  if (category) params.append('category', category)

  const url = `${POLYMARKET_GAMMA_API}/markets?${params.toString()}`
  try {
    const res = await fetch(url)
    const raw = await res.json()
    const markets = (Array.isArray(raw) ? raw : (raw.markets ?? [])).map(
      (m: RawGammaMarket) => normalizeGammaMarket(m)
    )
    return {
      source: `Gamma Markets (order=${order})`,
      url,
      markets,
      error: null,
      duration: performance.now() - start,
    }
  } catch (err) {
    return {
      source: `Gamma Markets (order=${order})`,
      url,
      markets: [],
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    }
  }
}

async function fetchGammaEventsDirect(
  limit: number,
  offset: number,
  order: string,
  category?: string
): Promise<ApiTestResult> {
  const start = performance.now()
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    archived: 'false',
    limit: String(limit),
    offset: String(offset),
    order,
    ascending: 'false',
    with_markets: 'true',
  })
  if (category) params.append('category', category)

  const url = `${POLYMARKET_GAMMA_API}/events?${params.toString()}`
  try {
    const res = await fetch(url)
    const raw = await res.json()
    const events: RawGammaEvent[] = Array.isArray(raw)
      ? raw
      : (raw.events ?? [])
    const markets = events
      .map((ev) => eventToMarket(ev))
      .filter((m): m is PolymarketMarket => m !== null)
    return {
      source: `Gamma Events (order=${order})`,
      url,
      markets,
      error: null,
      duration: performance.now() - start,
    }
  } catch (err) {
    return {
      source: `Gamma Events (order=${order})`,
      url,
      markets: [],
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    }
  }
}

interface PolymarketTestPageProps {
  onClose: () => void
}

const PolymarketTestPage: React.FC<PolymarketTestPageProps> = ({ onClose }) => {
  const [results, setResults] = useState<ApiTestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const runTests = useCallback(async () => {
    setLoading(true)
    setResults([])

    const tests = [
      () => fetchViaProxy(20, 0),
      () => fetchGammaMarketsDirect(20, 0, 'volumeNum'),
      () => fetchGammaMarketsDirect(20, 0, 'volume24hr'),
      () => fetchGammaEventsDirect(20, 0, 'volumeNum'),
      () => fetchGammaEventsDirect(20, 0, 'volume24hr'),
    ]

    const allResults: ApiTestResult[] = []
    for (const test of tests) {
      const r = await test()
      allResults.push(r)
      setResults([...allResults])
    }
    setLoading(false)
  }, [])

  // const filteredResults =
  //   selectedSource === 'all'
  //     ? results
  //     : results.filter((r) => r.source.includes(selectedSource))

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
      <h2 style={{ marginBottom: 12 }}>Polymarket API 对比测试</h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        对比 Proxy (wapi.testring.org) 和直接调用 Polymarket Gamma API
        的数据差异
      </p>
      <div
        style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}
      >
        <button
          onClick={runTests}
          disabled={loading}
          className="polymarket-list__positions-btn"
        >
          {loading ? '测试中...' : '运行对比测试'}
        </button>
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          style={{ padding: '6px 12px' }}
        >
          <option value="all">全部来源</option>
          <option value="Proxy">仅代理</option>
          <option value="Gamma Markets">仅 Gamma Markets</option>
          <option value="Gamma Events">仅 Gamma Events</option>
        </select>
      </div>

      {results.map((r, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: 20,
            border: '1px solid #333',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#1a1a2e',
              padding: '10px 14px',
              borderBottom: '1px solid #333',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>{r.source}</div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                marginTop: 4,
                wordBreak: 'break-all',
              }}
            >
              {r.url}
            </div>
            <div style={{ fontSize: 12, color: '#4ecdc4', marginTop: 4 }}>
              返回 {r.markets.length} 条 · 耗时 {r.duration.toFixed(0)}ms
              {r.error && (
                <span style={{ color: '#ff6b6b' }}> · 错误: {r.error}</span>
              )}
            </div>
          </div>

          {r.error ? (
            <div style={{ padding: 14, color: '#ff6b6b' }}>
              请求失败: {r.error}
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: '#0f0f1a' }}>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      width: '50%',
                    }}
                  >
                    市场
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                    24h 交易量
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                    Event 24h 交易量
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                    总交易量
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.markets.slice(0, 10).map((m) => (
                  <tr key={m.slug} style={{ borderTop: '1px solid #222' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <img
                          src={m.image || ''}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                              'none'
                          }}
                        />
                        <span style={{ fontSize: 13 }}>{m.question}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: '#4ecdc4',
                      }}
                    >
                      {formatPolymarketVolume(m.volume24hr)}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: '#f0c040',
                      }}
                    >
                      {m.eventVolume24hr !== undefined
                        ? formatPolymarketVolume(String(m.eventVolume24hr))
                        : '-'}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: '#888',
                      }}
                    >
                      {formatPolymarketVolume(m.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {results.length === 0 && !loading && (
        <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>
          点击「运行对比测试」开始对比不同 API 来源的数据
        </div>
      )}
    </div>
  )
}

export default PolymarketTestPage
