#!/usr/bin/env node
/**
 * Minimal Esplora-compatible HTTP API backed by bitcoin-cli (scantxoutset + sendrawtransaction)
 * against ring-bitcoind-regtest. No electrs image required.
 */
import http from 'http'
import { execFileSync } from 'child_process'

const PORT = Number(process.env.ESPLORA_PROXY_PORT || 3002)

function cliJson(args) {
  const out = execFileSync(
    'docker',
    [
      'exec',
      'ring-bitcoind-regtest',
      'bitcoin-cli',
      '-regtest',
      '-rpcuser=ci',
      '-rpcpassword=cipass',
      ...args,
    ],
    { encoding: 'utf8' }
  )
  return JSON.parse(out)
}

function cliRaw(args) {
  return execFileSync(
    'docker',
    [
      'exec',
      'ring-bitcoind-regtest',
      'bitcoin-cli',
      '-regtest',
      '-rpcuser=ci',
      '-rpcpassword=cipass',
      ...args,
    ],
    { encoding: 'utf8' }
  ).trim()
}

function scanUtxos(addr) {
  const scanobjects = JSON.stringify([`addr(${addr})`])
  const out = cliJson(['scantxoutset', 'start', scanobjects])
  try {
    cliRaw(['scantxoutset', 'abort'])
  } catch {
    /* ignore */
  }
  return out.unspents ?? []
}

function mapUtxo(u) {
  const sats = Math.round(Number(u.amount) * 1e8)
  const height = u.height
  return {
    txid: u.txid,
    vout: u.vout,
    value: sats,
    status: {
      confirmed: height != null && height > 0,
      ...(height != null && height > 0 ? { block_height: height } : {}),
    },
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')

  const sendJson = (code, body) => {
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  const sendText = (code, text) => {
    res.writeHead(code, { 'content-type': 'text/plain' })
    res.end(text)
  }

  try {
    if (req.method === 'GET' && url.pathname === '/blocks/tip/height') {
      const h = cliJson(['getblockcount'])
      return sendText(200, String(h))
    }

    if (req.method === 'GET' && url.pathname === '/fee-estimates') {
      return sendJson(200, { 3: 5, 6: 5 })
    }

    const addrUtxo = /^\/address\/([^/]+)\/utxo$/.exec(url.pathname)
    if (req.method === 'GET' && addrUtxo) {
      const addr = decodeURIComponent(addrUtxo[1])
      const raw = scanUtxos(addr)
      return sendJson(200, raw.map(mapUtxo))
    }

    const addrStats = /^\/address\/([^/]+)$/.exec(url.pathname)
    if (req.method === 'GET' && addrStats) {
      const addr = decodeURIComponent(addrStats[1])
      const raw = scanUtxos(addr)
      const mapped = raw.map(mapUtxo)
      let chainFunded = 0
      let mempoolFunded = 0
      for (const u of mapped) {
        if (u.status.confirmed) chainFunded += u.value
        else mempoolFunded += u.value
      }
      return sendJson(200, {
        chain_stats: {
          funded_txo_sum: chainFunded,
          spent_txo_sum: 0,
        },
        mempool_stats: {
          funded_txo_sum: mempoolFunded,
          spent_txo_sum: 0,
        },
      })
    }

    if (req.method === 'POST' && url.pathname === '/tx') {
      let body = ''
      req.on('data', (c) => {
        body += c
      })
      req.on('end', () => {
        try {
          const hex = body.trim()
          const txid = cliRaw(['sendrawtransaction', hex])
          sendText(200, txid)
        } catch (e) {
          sendText(400, e instanceof Error ? e.message : String(e))
        }
      })
      return
    }

    sendJson(404, { error: 'not found' })
  } catch (e) {
    sendText(500, e instanceof Error ? e.message : String(e))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.error(`esplora-proxy listening on ${PORT}`)
})
