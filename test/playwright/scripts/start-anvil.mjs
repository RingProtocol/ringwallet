#!/usr/bin/env node
/**
 * Start Anvil for E2E testing.
 * Usage: node test/Playwright/scripts/start-anvil.mjs <chainId> <port>
 *
 * Startup mode (same key-resolution pattern as test/evmchain/lib/resolveForkUrl.ts):
 *   1. Alchemy fork — when ALCHEMY_API_KEY / VITE_ALCHEMY_RPC_KEY is set and the
 *      chain has an Alchemy endpoint (e.g. Sepolia, Mainnet, Optimism).
 *   2. Public-RPC fork — for chains without Alchemy but with a fork-compatible RPC.
 *   3. Fresh local chain — for chains whose RPCs don't support the forking protocol
 *      (e.g. Hyperliquid Testnet, Plasma, MegaETH). Anvil starts with --chain-id only.
 *      Playwright's route interception redirects all app RPC calls to this local anvil,
 *      so the app never reaches the real testnet.
 *
 * After anvil is ready, sets the E2E sender balance via anvil_setBalance, then stays
 * alive until killed — Playwright webServer manages the process lifecycle.
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..', '..')

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadDotenv(path.join(repoRoot, '.env.test'))
loadDotenv(path.join(repoRoot, '.env'))

function getAlchemyKey() {
  return (
    process.env.ALCHEMY_API_KEY?.trim() ||
    process.env.VITE_ALCHEMY_RPC_KEY?.trim() ||
    ''
  )
}

/**
 * Chains with Alchemy archive nodes — ideal for anvil forking.
 * Mirrors the ENV config in src/config/chains.ts.
 */
const ALCHEMY_FORK_BUILDERS = {
  1: (key) => `https://eth-mainnet.g.alchemy.com/v2/${key}`,
  11155111: (key) => `https://eth-sepolia.g.alchemy.com/v2/${key}`,
  10: (key) => `https://optimism-mainnet.g.alchemy.com/v2/${key}`,
  42161: (key) => `https://arb1.arbitrum.io/v2/${key}`,
  137: (key) => `https://polygon-rpc.com/v2/${key}`,
}

/**
 * Chain IDs that run as a fresh local chain instead of forking a real network.
 * Includes chains whose RPCs don't support archive forking AND chains where a
 * fresh chain is preferred for E2E stability (no network dependency, instant
 * startup). Route interception in the fixture redirects all app RPC calls to
 * the local anvil, so the app never reaches a real endpoint regardless.
 */
const NO_FORK_CHAIN_IDS = new Set([
  998, // Hyperliquid Testnet — fork not supported
  9746, // Plasma Testnet — fork not supported
  6342, // MegaETH Testnet — fork not supported
  568, // Dogechain Testnet — fork not supported
  11155111, // Sepolia — use fresh chain; Alchemy fork is slow and adds flakiness
])

/**
 * Public fallback RPCs for Alchemy-unsupported chains that DO support forking.
 * Mirrors RPC_FALLBACK in src/config/chains.ts.
 */
const PUBLIC_FORK_RPCS = {
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  195: 'https://testrpc.xlayer.tech',
}

function buildAnvilArgs(chainId, port) {
  const args = ['--port', String(port), '--silent']

  // Fresh-chain list takes priority — check before any fork attempt.
  if (NO_FORK_CHAIN_IDS.has(chainId)) {
    console.log(
      `[anvil] starting fresh local chain chainId=${chainId} on port ${port} (fork not supported)`
    )
    return [...args, '--chain-id', String(chainId)]
  }

  // Prefer Alchemy fork when an API key is available
  const key = getAlchemyKey()
  const alchemyBuilder = ALCHEMY_FORK_BUILDERS[chainId]
  if (alchemyBuilder && key) {
    const forkUrl = alchemyBuilder(key)
    console.log(
      `[anvil] forking chainId=${chainId} from Alchemy on port ${port}`
    )
    return [...args, '--fork-url', forkUrl]
  }

  // For chains that support public-RPC forking
  if (PUBLIC_FORK_RPCS[chainId]) {
    console.log(
      `[anvil] forking chainId=${chainId} from ${PUBLIC_FORK_RPCS[chainId]} on port ${port}`
    )
    return [...args, '--fork-url', PUBLIC_FORK_RPCS[chainId]]
  }

  // No fork URL available — start a fresh local chain.
  console.log(
    `[anvil] starting fresh local chain chainId=${chainId} on port ${port} (no fork URL available)`
  )
  return [...args, '--chain-id', String(chainId)]
}

async function waitReady(port, timeoutMs = 30_000) {
  const rpc = `http://127.0.0.1:${port}`
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: [],
        }),
      })
      const json = await res.json()
      if (json.result) {
        const id = parseInt(json.result, 16)
        console.log(`[anvil] ready on port ${port} (chainId=${id})`)
        return id
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(
    `[anvil] timed out after ${timeoutMs}ms waiting for port ${port}`
  )
}

async function setBalance(port, address, ether) {
  // Convert ether amount to wei hex (avoid floating point precision issues)
  const weiHex = '0x' + (BigInt(Math.round(ether)) * 10n ** 18n).toString(16)
  const res = await fetch(`http://127.0.0.1:${port}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'anvil_setBalance',
      params: [address, weiHex],
    }),
  })
  const json = await res.json()
  if (json.error)
    throw new Error(`anvil_setBalance failed: ${json.error.message}`)
}

async function main() {
  const [, , chainIdArg, portArg] = process.argv
  const chainId = parseInt(chainIdArg || '998', 10)
  const port = parseInt(portArg || '8545', 10)

  const anvilArgs = buildAnvilArgs(chainId, port)
  const anvilProc = spawn('anvil', anvilArgs, {
    stdio: ['ignore', 'inherit', 'inherit'],
  })

  anvilProc.on('exit', (code) => {
    process.exit(code ?? 1)
  })

  // Forward termination signals to anvil so it exits cleanly when Playwright
  // kills this wrapper process after tests complete.
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      anvilProc.kill()
      process.exit(0)
    })
  }

  await waitReady(port)

  // Fund the E2E test sender address (index 0 derived from E2E_CONFIG_EVM.masterSeed)
  const TEST_SENDER = '0x9fe8b07AC19eAe1f3548D8379A534070A89Ee620'
  await setBalance(port, TEST_SENDER, 100)
  console.log(
    `[anvil] funded ${TEST_SENDER} with 100 tokens on chainId=${chainId}`
  )

  // Stay alive — Playwright kills this process after tests complete
  await new Promise(() => {})
}

main().catch((e) => {
  console.error('[anvil]', e.message)
  process.exit(1)
})
