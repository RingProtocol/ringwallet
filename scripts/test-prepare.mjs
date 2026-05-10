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

    // --- OP Sepolia testnet (fresh local chain, no fork)
    const opSepoliaPort = 8557
    if (await waitAnvilReady(opSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${opSepoliaPort} already serving JSON-RPC (skip OP Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '11155420', '--port', String(opSepoliaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=11155420 port=${opSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(opSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: OP Sepolia anvil ready on ${opSepoliaPort}.`
          : `[test:prepare] EVM: OP Sepolia anvil on ${opSepoliaPort} not ready in time.`
      )
    }

    // --- Arbitrum Sepolia testnet (fresh local chain, no fork)
    const arbitrumSepoliaPort = 8558
    if (await waitAnvilReady(arbitrumSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${arbitrumSepoliaPort} already serving JSON-RPC (skip Arbitrum Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '421614',
          '--port',
          String(arbitrumSepoliaPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=421614 port=${arbitrumSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(arbitrumSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Arbitrum Sepolia anvil ready on ${arbitrumSepoliaPort}.`
          : `[test:prepare] EVM: Arbitrum Sepolia anvil on ${arbitrumSepoliaPort} not ready in time.`
      )
    }

    // --- Polygon Amoy testnet (fresh local chain, no fork)
    const polygonAmoyPort = 8559
    if (await waitAnvilReady(polygonAmoyPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${polygonAmoyPort} already serving JSON-RPC (skip Polygon Amoy).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '80002', '--port', String(polygonAmoyPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=80002 port=${polygonAmoyPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(polygonAmoyPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Polygon Amoy anvil ready on ${polygonAmoyPort}.`
          : `[test:prepare] EVM: Polygon Amoy anvil on ${polygonAmoyPort} not ready in time.`
      )
    }

    // --- Base mainnet (fresh local chain, no fork)
    const basePort = 8560
    if (await waitAnvilReady(basePort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${basePort} already serving JSON-RPC (skip Base).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '8453', '--port', String(basePort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=8453 port=${basePort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(basePort)
      console.log(
        ok
          ? `[test:prepare] EVM: Base anvil ready on ${basePort}.`
          : `[test:prepare] EVM: Base anvil on ${basePort} not ready in time.`
      )
    }

    // --- Base Sepolia testnet (fresh local chain, no fork)
    const baseSepoliaPort = 8561
    if (await waitAnvilReady(baseSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${baseSepoliaPort} already serving JSON-RPC (skip Base Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '84532', '--port', String(baseSepoliaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=84532 port=${baseSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(baseSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Base Sepolia anvil ready on ${baseSepoliaPort}.`
          : `[test:prepare] EVM: Base Sepolia anvil on ${baseSepoliaPort} not ready in time.`
      )
    }

    // --- zkSync Era mainnet (fresh local chain, no fork)
    const zksyncPort = 8562
    if (await waitAnvilReady(zksyncPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${zksyncPort} already serving JSON-RPC (skip zkSync).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '324', '--port', String(zksyncPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=324 port=${zksyncPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(zksyncPort)
      console.log(
        ok
          ? `[test:prepare] EVM: zkSync anvil ready on ${zksyncPort}.`
          : `[test:prepare] EVM: zkSync anvil on ${zksyncPort} not ready in time.`
      )
    }

    // --- zkSync Sepolia testnet (fresh local chain, no fork)
    const zksyncSepoliaPort = 8563
    if (await waitAnvilReady(zksyncSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${zksyncSepoliaPort} already serving JSON-RPC (skip zkSync Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '300', '--port', String(zksyncSepoliaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=300 port=${zksyncSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(zksyncSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: zkSync Sepolia anvil ready on ${zksyncSepoliaPort}.`
          : `[test:prepare] EVM: zkSync Sepolia anvil on ${zksyncSepoliaPort} not ready in time.`
      )
    }

    // --- Linea mainnet (fresh local chain, no fork)
    const lineaPort = 8564
    if (await waitAnvilReady(lineaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${lineaPort} already serving JSON-RPC (skip Linea).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '59144', '--port', String(lineaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=59144 port=${lineaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(lineaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Linea anvil ready on ${lineaPort}.`
          : `[test:prepare] EVM: Linea anvil on ${lineaPort} not ready in time.`
      )
    }

    // --- Linea Sepolia testnet (fresh local chain, no fork)
    const lineaSepoliaPort = 8565
    if (await waitAnvilReady(lineaSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${lineaSepoliaPort} already serving JSON-RPC (skip Linea Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '59141', '--port', String(lineaSepoliaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=59141 port=${lineaSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(lineaSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Linea Sepolia anvil ready on ${lineaSepoliaPort}.`
          : `[test:prepare] EVM: Linea Sepolia anvil on ${lineaSepoliaPort} not ready in time.`
      )
    }

    // --- Scroll mainnet (fresh local chain, no fork)
    const scrollPort = 8566
    if (await waitAnvilReady(scrollPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${scrollPort} already serving JSON-RPC (skip Scroll).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '534352', '--port', String(scrollPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=534352 port=${scrollPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(scrollPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Scroll anvil ready on ${scrollPort}.`
          : `[test:prepare] EVM: Scroll anvil on ${scrollPort} not ready in time.`
      )
    }

    // --- Scroll Sepolia testnet (fresh local chain, no fork)
    const scrollSepoliaPort = 8567
    if (await waitAnvilReady(scrollSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${scrollSepoliaPort} already serving JSON-RPC (skip Scroll Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '534351',
          '--port',
          String(scrollSepoliaPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=534351 port=${scrollSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(scrollSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Scroll Sepolia anvil ready on ${scrollSepoliaPort}.`
          : `[test:prepare] EVM: Scroll Sepolia anvil on ${scrollSepoliaPort} not ready in time.`
      )
    }

    // --- BNB Chain mainnet (fresh local chain, no fork)
    const bnbPort = 8568
    if (await waitAnvilReady(bnbPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${bnbPort} already serving JSON-RPC (skip BNB).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '56', '--port', String(bnbPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=56 port=${bnbPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(bnbPort)
      console.log(
        ok
          ? `[test:prepare] EVM: BNB anvil ready on ${bnbPort}.`
          : `[test:prepare] EVM: BNB anvil on ${bnbPort} not ready in time.`
      )
    }

    // --- BNB Testnet (fresh local chain, no fork)
    const bnbTestnetPort = 8569
    if (await waitAnvilReady(bnbTestnetPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${bnbTestnetPort} already serving JSON-RPC (skip BNB Testnet).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '97', '--port', String(bnbTestnetPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=97 port=${bnbTestnetPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(bnbTestnetPort)
      console.log(
        ok
          ? `[test:prepare] EVM: BNB Testnet anvil ready on ${bnbTestnetPort}.`
          : `[test:prepare] EVM: BNB Testnet anvil on ${bnbTestnetPort} not ready in time.`
      )
    }

    // --- Celo mainnet (fresh local chain, no fork)
    const celoPort = 8570
    if (await waitAnvilReady(celoPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${celoPort} already serving JSON-RPC (skip Celo).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '42220', '--port', String(celoPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=42220 port=${celoPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(celoPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Celo anvil ready on ${celoPort}.`
          : `[test:prepare] EVM: Celo anvil on ${celoPort} not ready in time.`
      )
    }

    // --- Celo Alfajores testnet (fresh local chain, no fork)
    const celoAlfajoresPort = 8571
    if (await waitAnvilReady(celoAlfajoresPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${celoAlfajoresPort} already serving JSON-RPC (skip Celo Alfajores).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '44787',
          '--port',
          String(celoAlfajoresPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=44787 port=${celoAlfajoresPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(celoAlfajoresPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Celo Alfajores anvil ready on ${celoAlfajoresPort}.`
          : `[test:prepare] EVM: Celo Alfajores anvil on ${celoAlfajoresPort} not ready in time.`
      )
    }

    // --- Gnosis mainnet (fresh local chain, no fork)
    const gnosisPort = 8572
    if (await waitAnvilReady(gnosisPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${gnosisPort} already serving JSON-RPC (skip Gnosis).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '100', '--port', String(gnosisPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=100 port=${gnosisPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(gnosisPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Gnosis anvil ready on ${gnosisPort}.`
          : `[test:prepare] EVM: Gnosis anvil on ${gnosisPort} not ready in time.`
      )
    }

    // --- Gnosis Chiado testnet (fresh local chain, no fork)
    const gnosisChiadoPort = 8573
    if (await waitAnvilReady(gnosisChiadoPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${gnosisChiadoPort} already serving JSON-RPC (skip Gnosis Chiado).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '10200', '--port', String(gnosisChiadoPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=10200 port=${gnosisChiadoPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(gnosisChiadoPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Gnosis Chiado anvil ready on ${gnosisChiadoPort}.`
          : `[test:prepare] EVM: Gnosis Chiado anvil on ${gnosisChiadoPort} not ready in time.`
      )
    }

    // --- Mantle mainnet (fresh local chain, no fork)
    const mantlePort = 8574
    if (await waitAnvilReady(mantlePort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${mantlePort} already serving JSON-RPC (skip Mantle).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '5000', '--port', String(mantlePort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=5000 port=${mantlePort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(mantlePort)
      console.log(
        ok
          ? `[test:prepare] EVM: Mantle anvil ready on ${mantlePort}.`
          : `[test:prepare] EVM: Mantle anvil on ${mantlePort} not ready in time.`
      )
    }

    // --- Mantle Sepolia testnet (fresh local chain, no fork)
    const mantleSepoliaPort = 8575
    if (await waitAnvilReady(mantleSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${mantleSepoliaPort} already serving JSON-RPC (skip Mantle Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '5003', '--port', String(mantleSepoliaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=5003 port=${mantleSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(mantleSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Mantle Sepolia anvil ready on ${mantleSepoliaPort}.`
          : `[test:prepare] EVM: Mantle Sepolia anvil on ${mantleSepoliaPort} not ready in time.`
      )
    }

    // --- Blast mainnet (fresh local chain, no fork)
    const blastPort = 8576
    if (await waitAnvilReady(blastPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${blastPort} already serving JSON-RPC (skip Blast).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '81457', '--port', String(blastPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=81457 port=${blastPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(blastPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Blast anvil ready on ${blastPort}.`
          : `[test:prepare] EVM: Blast anvil on ${blastPort} not ready in time.`
      )
    }

    // --- Blast Sepolia testnet (fresh local chain, no fork)
    const blastSepoliaPort = 8577
    if (await waitAnvilReady(blastSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${blastSepoliaPort} already serving JSON-RPC (skip Blast Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '168587773',
          '--port',
          String(blastSepoliaPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=168587773 port=${blastSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(blastSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Blast Sepolia anvil ready on ${blastSepoliaPort}.`
          : `[test:prepare] EVM: Blast Sepolia anvil on ${blastSepoliaPort} not ready in time.`
      )
    }

    // --- Zora mainnet (fresh local chain, no fork)
    const zoraPort = 8578
    if (await waitAnvilReady(zoraPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${zoraPort} already serving JSON-RPC (skip Zora).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '7777777', '--port', String(zoraPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=7777777 port=${zoraPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(zoraPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Zora anvil ready on ${zoraPort}.`
          : `[test:prepare] EVM: Zora anvil on ${zoraPort} not ready in time.`
      )
    }

    // --- Zora Sepolia testnet (fresh local chain, no fork)
    const zoraSepoliaPort = 8579
    if (await waitAnvilReady(zoraSepoliaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${zoraSepoliaPort} already serving JSON-RPC (skip Zora Sepolia).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '999999999',
          '--port',
          String(zoraSepoliaPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=999999999 port=${zoraSepoliaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(zoraSepoliaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Zora Sepolia anvil ready on ${zoraSepoliaPort}.`
          : `[test:prepare] EVM: Zora Sepolia anvil on ${zoraSepoliaPort} not ready in time.`
      )
    }

    // --- Fantom mainnet (fresh local chain, no fork)
    const fantomPort = 8580
    if (await waitAnvilReady(fantomPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${fantomPort} already serving JSON-RPC (skip Fantom).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '250', '--port', String(fantomPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=250 port=${fantomPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(fantomPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Fantom anvil ready on ${fantomPort}.`
          : `[test:prepare] EVM: Fantom anvil on ${fantomPort} not ready in time.`
      )
    }

    // --- Fantom Testnet (fresh local chain, no fork)
    const fantomTestnetPort = 8581
    if (await waitAnvilReady(fantomTestnetPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${fantomTestnetPort} already serving JSON-RPC (skip Fantom Testnet).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '4002', '--port', String(fantomTestnetPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=4002 port=${fantomTestnetPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(fantomTestnetPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Fantom Testnet anvil ready on ${fantomTestnetPort}.`
          : `[test:prepare] EVM: Fantom Testnet anvil on ${fantomTestnetPort} not ready in time.`
      )
    }

    // --- Moonbeam mainnet (fresh local chain, no fork)
    const moonbeamPort = 8582
    if (await waitAnvilReady(moonbeamPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${moonbeamPort} already serving JSON-RPC (skip Moonbeam).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '1284', '--port', String(moonbeamPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=1284 port=${moonbeamPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(moonbeamPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Moonbeam anvil ready on ${moonbeamPort}.`
          : `[test:prepare] EVM: Moonbeam anvil on ${moonbeamPort} not ready in time.`
      )
    }

    // --- Moonbase Alpha testnet (fresh local chain, no fork)
    const moonbaseAlphaPort = 8583
    if (await waitAnvilReady(moonbaseAlphaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${moonbaseAlphaPort} already serving JSON-RPC (skip Moonbase Alpha).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '1287', '--port', String(moonbaseAlphaPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=1287 port=${moonbaseAlphaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(moonbaseAlphaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Moonbase Alpha anvil ready on ${moonbaseAlphaPort}.`
          : `[test:prepare] EVM: Moonbase Alpha anvil on ${moonbaseAlphaPort} not ready in time.`
      )
    }

    // --- Polygon zkEVM mainnet (fresh local chain, no fork)
    const polygonZkevmPort = 8584
    if (await waitAnvilReady(polygonZkevmPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${polygonZkevmPort} already serving JSON-RPC (skip Polygon zkEVM).`
      )
    } else {
      const p = spawn(
        'anvil',
        ['--chain-id', '1101', '--port', String(polygonZkevmPort), '--silent'],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=1101 port=${polygonZkevmPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(polygonZkevmPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Polygon zkEVM anvil ready on ${polygonZkevmPort}.`
          : `[test:prepare] EVM: Polygon zkEVM anvil on ${polygonZkevmPort} not ready in time.`
      )
    }

    // --- Polygon zkEVM Cardona testnet (fresh local chain, no fork)
    const polygonZkevmCardonaPort = 8585
    if (await waitAnvilReady(polygonZkevmCardonaPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${polygonZkevmCardonaPort} already serving JSON-RPC (skip Polygon zkEVM Cardona).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '2442',
          '--port',
          String(polygonZkevmCardonaPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=2442 port=${polygonZkevmCardonaPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(polygonZkevmCardonaPort)
      console.log(
        ok
          ? `[test:prepare] EVM: Polygon zkEVM Cardona anvil ready on ${polygonZkevmCardonaPort}.`
          : `[test:prepare] EVM: Polygon zkEVM Cardona anvil on ${polygonZkevmCardonaPort} not ready in time.`
      )
    }

    // --- MegaETH Testnet (fresh local chain, no fork)
    const megaethTestnetPort = 8586
    if (await waitAnvilReady(megaethTestnetPort, 1500)) {
      console.log(
        `[test:prepare] EVM: port ${megaethTestnetPort} already serving JSON-RPC (skip MegaETH Testnet).`
      )
    } else {
      const p = spawn(
        'anvil',
        [
          '--chain-id',
          '6342',
          '--port',
          String(megaethTestnetPort),
          '--silent',
        ],
        { detached: true, stdio: 'ignore', cwd: repoRoot }
      )
      p.unref()
      console.log(
        `[test:prepare] EVM: spawned anvil chainId=6342 port=${megaethTestnetPort} (pid ${p.pid})`
      )
      const ok = await waitAnvilReady(megaethTestnetPort)
      console.log(
        ok
          ? `[test:prepare] EVM: MegaETH Testnet anvil ready on ${megaethTestnetPort}.`
          : `[test:prepare] EVM: MegaETH Testnet anvil on ${megaethTestnetPort} not ready in time.`
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
      '                 yarn test:chain:plasma (8555), yarn test:chain:plasma-testnet (8556),'
    )
    console.log(
      '                 yarn test:chain:op-sepolia (8557), yarn test:chain:arbitrum-sepolia (8558), yarn test:chain:polygon-amoy (8559),'
    )
    console.log(
      '                 yarn test:chain:base (8560), yarn test:chain:base-sepolia (8561),'
    )
    console.log(
      '                 yarn test:chain:zksync (8562), yarn test:chain:zksync-sepolia (8563),'
    )
    console.log(
      '                 yarn test:chain:linea (8564), yarn test:chain:linea-sepolia (8565),'
    )
    console.log(
      '                 yarn test:chain:scroll (8566), yarn test:chain:scroll-sepolia (8567),'
    )
    console.log(
      '                 yarn test:chain:bnb (8568), yarn test:chain:bnb-testnet (8569),'
    )
    console.log(
      '                 yarn test:chain:celo (8570), yarn test:chain:celo-alfajores (8571),'
    )
    console.log(
      '                 yarn test:chain:gnosis (8572), yarn test:chain:gnosis-chiado (8573),'
    )
    console.log(
      '                 yarn test:chain:mantle (8574), yarn test:chain:mantle-sepolia (8575),'
    )
    console.log(
      '                 yarn test:chain:blast (8576), yarn test:chain:blast-sepolia (8577),'
    )
    console.log(
      '                 yarn test:chain:zora (8578), yarn test:chain:zora-sepolia (8579),'
    )
    console.log(
      '                 yarn test:chain:fantom (8580), yarn test:chain:fantom-testnet (8581),'
    )
    console.log(
      '                 yarn test:chain:moonbeam (8582), yarn test:chain:moonbase-alpha (8583),'
    )
    console.log(
      '                 yarn test:chain:polygon-zkevm (8584), yarn test:chain:polygon-zkevm-cardona (8585),'
    )
    console.log('                 yarn test:chain:megaeth-testnet (8586)')
  }

  console.log('\n[test:prepare] Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
