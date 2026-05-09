import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { usePolymarketMarkets } from '@/hooks/usePolymarketMarkets'
import { I18nProvider } from '@/i18n'

// Minimal smoke-test: verify the hook can be called inside a React component
// without throwing and returns the expected shape on initial render.

describe('usePolymarketMarkets', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ source: 'polymarket', data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exports a function', () => {
    expect(typeof usePolymarketMarkets).toBe('function')
  })

  it('can be rendered inside a component without throwing', () => {
    let captured: ReturnType<typeof usePolymarketMarkets> | undefined

    function TestComponent() {
      captured = usePolymarketMarkets()
      return React.createElement('div', null, 'test')
    }

    const element = React.createElement(I18nProvider, {
      defaultLang: 'en',
      children: React.createElement(TestComponent),
    })

    expect(() => ReactDOMServer.renderToString(element)).not.toThrow()
    expect(captured).toBeDefined()
    expect(captured!.markets).toEqual([])
    expect(captured!.loading).toBe(true)
    expect(captured!.error).toBeNull()
    expect(captured!.hasMore).toBe(true)
    expect(captured!.activeCategory).toBe('all')
    expect(typeof captured!.setActiveCategory).toBe('function')
    expect(typeof captured!.loadMarkets).toBe('function')
    expect(typeof captured!.handleRetry).toBe('function')
  })
})
