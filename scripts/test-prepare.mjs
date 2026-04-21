#!/usr/bin/env node
/**
 * One-shot local prep for multichain integration / E2E stacks:
 * - Bitcoin: docker compose (bitcoind regtest)
 * - Solana: solana-test-validator (background)
 * - EVM: Anvil instances —
 *     Sepolia 11155111 on 8545 (fork, matches test/evmchain)
 *     Hyperliquid 998 on 8546
 *     Tron 728126428 on 8547
 *     Optimism 10 on 8548
 *     Arbitrum 42161 on 8549
 *     Polygon 137 on 8550
 *     Avalanche C-Chain 43114 on 8551
 *     Avalanche Fuji 43113 on 8552
 *     X Layer 196 on 8553
 *     X Layer Testnet 195 on 8554
 *     Plasma 9745 on 8555
 *     Plasma Testnet 9746 on 8556
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

    // --- Tron (fresh local chain, EVM-compatible, no fork)
    const tronPort = 8547
    if (await waitAnvilReady(tronPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${tronPort} already serving JSON-RPC (skip Tron).`
      )
    } else {
      const tp = spawn(
        'anvil',
        ['--chain-id', '728126428', '--port', String(tronPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      tp.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=728126428 port=${tronPort} (pid ${tp.pid})`
      )
      const ok = await waitAnvilReady(tronPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Tron anvil ready on ${tronPort}.`
          : `[test:prepare] EVM: Tron anvil on ${tronPort} not ready in time.`
      )
    }

    // --- Optimism (fresh local chain, no fork)
    const optimismPort = 8548
    if (await waitAnvilReady(optimismPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${optimismPort} already serving JSON-RPC (skip Optimism).`
      )
    } else {
      const op = spawn(
        'anvil',
        ['--chain-id', '10', '--port', String(optimismPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      op.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=10 port=${optimismPort} (pid ${op.pid})`
      )
      const ok = await waitAnvilReady(optimismPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Optimism anvil ready on ${optimismPort}.`
          : `[test:prepare] EVM: Optimism anvil on ${optimismPort} not ready in time.`
      )
    }

    // --- Arbitrum (fresh local chain, no fork)
    const arbitrumPort = 8549
    if (await waitAnvilReady(arbitrumPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${arbitrumPort} already serving JSON-RPC (skip Arbitrum).`
      )
    } else {
      const arb = spawn(
        'anvil',
        ['--chain-id', '42161', '--port', String(arbitrumPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      arb.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=42161 port=${arbitrumPort} (pid ${arb.pid})`
      )
      const ok = await waitAnvilReady(arbitrumPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Arbitrum anvil ready on ${arbitrumPort}.`
          : `[test:prepare] EVM: Arbitrum anvil on ${arbitrumPort} not ready in time.`
      )
    }

    // --- Polygon (fresh local chain, no fork)
    const polygonPort = 8550
    if (await waitAnvilReady(polygonPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${polygonPort} already serving JSON-RPC (skip Polygon).`
      )
    } else {
      const pol = spawn(
        'anvil',
        ['--chain-id', '137', '--port', String(polygonPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      pol.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=137 port=${polygonPort} (pid ${pol.pid})`
      )
      const ok = await waitAnvilReady(polygonPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Polygon anvil ready on ${polygonPort}.`
          : `[test:prepare] EVM: Polygon anvil on ${polygonPort} not ready in time.`
      )
    }

    // --- Avalanche C-Chain (fresh local chain, no fork)
    const avalanchePort = 8551
    if (await waitAnvilReady(avalanchePort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${avalanchePort} already serving JSON-RPC (skip Avalanche).`
      )
    } else {
      const avax = spawn(
        'anvil',
        ['--chain-id', '43114', '--port', String(avalanchePort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      avax.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=43114 port=${avalanchePort} (pid ${avax.pid})`
      )
      const ok = await waitAnvilReady(avalanchePort)
      console.log(
        ok
          ? `[test:prepare] EVM: Avalanche anvil ready on ${avalanchePort}.`
          : `[test:prepare] EVM: Avalanche anvil on ${avalanchePort} not ready in time.`
      )
    }

    // --- Avalanche Fuji testnet (fresh local chain, no fork)
    const fujiPort = 8552
    if (await waitAnvilReady(fujiPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${fujiPort} already serving JSON-RPC (skip Fuji).`
      )
    } else {
      const fuji = spawn(
        'anvil',
        ['--chain-id', '43113', '--port', String(fujiPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      fuji.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=43113 port=${fujiPort} (pid ${fuji.pid})`
      )
      const ok = await waitAnvilReady(fujiPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Fuji anvil ready on ${fujiPort}.`
          : `[test:prepare] EVM: Fuji anvil on ${fujiPort} not ready in time.`
      )
    }

    // --- X Layer mainnet (fresh local chain, no fork)
    const xlayerPort = 8553
    if (await waitAnvilReady(xlayerPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${xlayerPort} already serving JSON-RPC (skip X Layer).`
      )
    } else {
      const xl = spawn(
        'anvil',
        ['--chain-id', '196', '--port', String(xlayerPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      xl.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=196 port=${xlayerPort} (pid ${xl.pid})`
      )
      const ok = await waitAnvilReady(xlayerPort)
      console.log(
        ok
          ? `[test:prepare] EVM: X Layer anvil ready on ${xlayerPort}.`
          : `[test:prepare] EVM: X Layer anvil on ${xlayerPort} not ready in time.`
      )
    }

    // --- X Layer testnet (fresh local chain, no fork)
    const xlayerTestnetPort = 8554
    if (await waitAnvilReady(xlayerTestnetPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${xlayerTestnetPort} already serving JSON-RPC (skip X Layer Testnet).`
      )
    } else {
      const xlt = spawn(
        'anvil',
        ['--chain-id', '195', '--port', String(xlayerTestnetPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      xlt.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=195 port=${xlayerTestnetPort} (pid ${xlt.pid})`
      )
      const ok = await waitAnvilReady(xlayerTestnetPort)
      console.log(
        ok
          ? `[test:prepare] EVM: X Layer Testnet anvil ready on ${xlayerTestnetPort}.`
          : `[test:prepare] EVM: X Layer Testnet anvil on ${xlayerTestnetPort} not ready in time.`
      )
    }

    // --- Plasma mainnet (fresh local chain, no fork)
    const plasmaPort = 8555
    if (await waitAnvilReady(plasmaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${plasmaPort} already serving JSON-RPC (skip Plasma).`
      )
    } else {
      const pla = spawn(
        'anvil',
        ['--chain-id', '9745', '--port', String(plasmaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      pla.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=9745 port=${plasmaPort} (pid ${pla.pid})`
      )
      const ok = await waitAnvilReady(plasmaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Plasma anvil ready on ${plasmaPort}.`
          : `[test:prepare] EVM: Plasma anvil on ${plasmaPort} not ready in time.`
      )
    }

    // --- Plasma testnet (fresh local chain, no fork)
    const plasmaTestnetPort = 8556
    if (await waitAnvilReady(plasmaTestnetPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${plasmaTestnetPort} already serving JSON-RPC (skip Plasma Testnet).`
      )
    } else {
      const plt = spawn(
        'anvil',
        ['--chain-id', '9746', '--port', String(plasmaTestnetPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      plt.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=9746 port=${plasmaTestnetPort} (pid ${plt.pid})`
      )
      const ok = await waitAnvilReady(plasmaTestnetPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Plasma Testnet anvil ready on ${plasmaTestnetPort}.`
          : `[test:prepare] EVM: Plasma Testnet anvil on ${plasmaTestnetPort} not ready in time.`
      )
    }

    console.log(
      '  → Playwright E2E: yarn test:e2e (globalSetup also starts anvil if needed)'
    )
    console.log(
      '  → Vitest EVM: yarn test:chain:sepolia (8545), yarn test:chain:hyperliquid (8546),'
    )
    console.log('                 yarn test:multichain:tron-local (8547),')
    console.log(
      '                 yarn test:chain:optimism (8548), yarn test:chain:arbitrum (8549), yarn test:chain:polygon (8550),'
    )
    console.log(
      '                 yarn test:chain:avalanche (8551), yarn test:chain:fuji (8552),'
    )
    console.log(
      '                 yarn test:chain:xlayer (8553), yarn test:chain:xlayer-testnet (8554),'
    )
    console.log(
      '                 yarn test:chain:plasma (8555), yarn test:chain:plasma-testnet (8556)'
    )
  }

  console.log('\n[test:prepare] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
