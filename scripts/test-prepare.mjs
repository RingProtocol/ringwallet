#!/usr/bin/env node
/**
 * One-shot local prep for multichain integration / E2E stacks:
 * - Bitcoin: docker compose (bitcoind regtest)
 * - Solana: solana-test-validator (background)
 * - EVM: two Anvil instances — Sepolia 11155111 on 8545 (matches test/evmchain), Hyperliquid 998 on 8546
 *
 * Requires: Docker, optional Solana CLI, optional Foundry `anvil`.
 * Idempotent-ish: skips Solana/Anvil spawn if RPC already answers on the port.
 */
import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

function hasCmd(name) {
  try {
    const cmd =
      process.platform === 'win32' ? `where ${name}` : `command -v ${name}`
    execSync(cmd, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function sh(cmd) {
  return execSync(cmd, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

async function rpcReady(url, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    })
    const j = await r.json()
    return !j.error && j.result !== undefined
  } catch {
    return false
  }
}

async function waitSolanaReady(maxMs = 90_000) {
  const deadline = Date.now() + maxMs
  const url = process.env.TEST_SOLANA_RPC_URL || 'http://127.0.0.1:8899'
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getLatestBlockhash',
    params: [{ commitment: 'confirmed' }],
  }
  while (Date.now() < deadline) {
    if (await rpcReady(url, body)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

/**
 * Resolve the Sepolia fork URL from env — mirrors resolveForkUrl.ts logic.
 * Returns null when no key/URL is available.
 */
function resolveSepoliaForkUrl() {
  // load .env.test / .env if not already in process.env
  for (const name of ['.env.test', '.env']) {
    const p = path.join(repoRoot, name)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
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
  const key =
    process.env.ALCHEMY_API_KEY?.trim() ||
    process.env.VITE_ALCHEMY_RPC_KEY?.trim()
  if (key) return `https://eth-sepolia.g.alchemy.com/v2/${key}`
  const fromSepolia = process.env.TESTCHAIN_FORK_URL_SEPOLIA?.trim()
  if (fromSepolia) return fromSepolia
  const fallback = process.env.TESTCHAIN_FORK_URL?.trim()
  if (fallback) return fallback
  return null
}

async function waitAnvilReady(port, maxMs = 60_000) {
  const deadline = Date.now() + maxMs
  const url = `http://127.0.0.1:${port}`
  while (Date.now() < deadline) {
    if (
      await rpcReady(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: [],
      })
    ) {
      return true
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

async function main() {
  console.log('[test:prepare] repo root:', repoRoot)

  // ─── Bitcoin (Docker) ─────────────────────────────────────────────
  console.log('\n[test:prepare] 1/3 Bitcoin regtest (Docker bitcoind)...')
  try {
    sh('docker compose -f test/simulation/bitcoin/docker-compose.yml up -d')
    console.log(
      '[test:prepare] Bitcoin: container ring-bitcoind-regtest should be up.'
    )
    console.log(
      '  → Run Bitcoin integration: RUN_BITCOIN_REGTEST=1 yarn test:multichain:bitcoin-regtest'
    )
  } catch (e) {
    console.error(
      '[test:prepare] Bitcoin: docker compose failed (start Docker Desktop?):',
      e instanceof Error ? e.message : e
    )
  }

  // ─── Solana ─────────────────────────────────────────────────────────
  console.log('\n[test:prepare] 2/3 Solana local validator...')
  const solanaUrl = process.env.TEST_SOLANA_RPC_URL || 'http://127.0.0.1:8899'
  const solanaProbe = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getLatestBlockhash',
    params: [{ commitment: 'confirmed' }],
  }
  if (await rpcReady(solanaUrl, solanaProbe)) {
    console.log(
      '[test:prepare] Solana: RPC already up at',
      solanaUrl,
      '(skip spawn).'
    )
  } else if (hasCmd('solana-test-validator')) {
    const p = spawn('solana-test-validator', ['--reset', '--quiet'], {
      detached: true,
      stdio: 'ignore',
      cwd: repoRoot,
    })
    p.unref()
    console.log(
      '[test:prepare] Solana: started solana-test-validator (pid',
      p.pid,
      ')'
    )
    const ok = await waitSolanaReady()
    console.log(
      ok
        ? '[test:prepare] Solana: RPC ready.'
        : '[test:prepare] Solana: RPC not ready in time; check logs manually.'
    )
    console.log(
      '  → Run: SOLANA_LOCAL_TEST=1 yarn test:multichain:solana-local'
    )
  } else {
    console.warn(
      '[test:prepare] Solana: solana-test-validator not in PATH (install Solana CLI). Skip.'
    )
  }

  // ─── EVM (Anvil) — Sepolia fork on 8545, Hyperliquid fresh on 8546
  console.log('\n[test:prepare] 3/3 EVM Anvil (Foundry)...')

  if (!hasCmd('anvil')) {
    console.warn(
      '[test:prepare] EVM: `anvil` not in PATH (install Foundry: https://getfoundry.sh). Skip.'
    )
  } else {
    // --- Sepolia: must use --fork-url so simulation tests see real fork state.
    //     (start-anvil.mjs puts Sepolia in NO_FORK_CHAIN_IDS for Playwright;
    //      we spawn anvil directly here to avoid that.)
    const sepoliaPort = 8545
    if (await waitAnvilReady(sepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${sepoliaPort} already serving JSON-RPC (skip Sepolia fork).`
      )
    } else {
      const forkUrl = resolveSepoliaForkUrl()
      if (forkUrl) {
        const p = spawn(
          'anvil',
          ['--fork-url', forkUrl, '--port', String(sepoliaPort), '--silent'],
          { detached: true, stdio: 'ignore', cwd: repoRoot }
        )
        p.unref()
        console.log(
          `[test:prepare] EVM: spawned anvil Sepolia fork on port ${sepoliaPort} (pid ${p.pid})`
        )
        const ok = await waitAnvilReady(sepoliaPort)
        console.log(
          ok
            ? `[test:prepare] EVM: Sepolia fork ready on ${sepoliaPort}.`
            : `[test:prepare] EVM: Sepolia fork on ${sepoliaPort} not ready in time.`
        )
      } else {
        console.warn(
          '[test:prepare] EVM: no Alchemy key found — cannot start Sepolia fork. Set ALCHEMY_API_KEY or VITE_ALCHEMY_RPC_KEY in .env.test'
        )
      }
    }

    // --- Hyperliquid (fresh local chain, no fork)
    const startAnvil = path.join(
      repoRoot,
      'test/playwright/scripts/start-anvil.mjs'
    )
    const hlPort = 8546
    if (await waitAnvilReady(hlPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${hlPort} already serving JSON-RPC (skip Hyperliquid).`
      )
    } else {
      const p = spawn(process.execPath, [startAnvil, '998', String(hlPort)], {
        detached: true,
        stdio: 'ignore',
        cwd: repoRoot,
        env: process.env,
      })
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=998 port=${hlPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(hlPort)
      console.log(
        ok
          ? `[test:prepare] EVM: anvil ready on ${hlPort}.`
          : `[test:prepare] EVM: anvil on ${hlPort} not ready in time.`
      )
    }

    console.log(
      '  → Playwright E2E: yarn test:e2e (globalSetup also starts anvil if needed)'
    )
    console.log(
      '  → Vitest EVM: yarn test:chain:sepolia (Sepolia fork on 8545), yarn test:chain:hyperliquid (998 on 8546)'
    )
  }

  console.log('\n[test:prepare] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
