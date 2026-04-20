#!/usr/bin/env node
/**
 * One-shot local prep for multichain integration / E2E stacks:
 * - Bitcoin: docker compose (bitcoind regtest)
 * - Solana: solana-test-validator (background)
 * - EVM: two Anvil instances (same ports as Playwright E2E: 8545, 8546)
 *
 * Requires: Docker, optional Solana CLI, optional Foundry `anvil`.
 * Idempotent-ish: skips Solana/Anvil spawn if RPC already answers on the port.
 */
import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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
    sh(
      'docker compose -f test/bitcoin-regtest/docker-compose.yml up -d'
    )
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

  // ─── EVM (Anvil) — same chain IDs / ports as test/Playwright/env EVM_TESTNET_CHAINS
  console.log('\n[test:prepare] 3/3 EVM Anvil (Foundry)...')
  const anvilChains = [
    { chainId: 998, port: 8545 },
    { chainId: 11155111, port: 8546 },
  ]

  if (!hasCmd('anvil')) {
    console.warn(
      '[test:prepare] EVM: `anvil` not in PATH (install Foundry: https://getfoundry.sh). Skip.'
    )
  } else {
    const startAnvil = path.join(
      repoRoot,
      'test/Playwright/scripts/start-anvil.mjs'
    )
    for (const { chainId, port } of anvilChains) {
      if (await waitAnvilReady(port, 1500)) {
        console.log(
          `[test:prepare] EVM: port ${port} already serving JSON-RPC (skip chainId=${chainId}).`
        )
        continue
      }
      const p = spawn(process.execPath, [startAnvil, String(chainId), String(port)], {
        detached: true,
        stdio: 'ignore',
        cwd: repoRoot,
        env: process.env,
      })
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=${chainId} port=${port} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(port)
      console.log(
        ok
          ? `[test:prepare] EVM: anvil ready on ${port}.`
          : `[test:prepare] EVM: anvil on ${port} not ready in time.`
      )
    }
    console.log('  → Playwright E2E: yarn test:e2e (globalSetup also starts anvil if needed)')
    console.log('  → Vitest chain: yarn test:chain (uses Anvil fork per test/evmchain)')
  }

  console.log('\n[test:prepare] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
