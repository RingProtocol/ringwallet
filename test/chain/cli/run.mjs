#!/usr/bin/env node
/**
 * Step-by-step helpers for test/chain (no TS runner required).
 * Usage: node test/chain/cli/run.mjs <command> [args]
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')

function loadDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
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

loadDotenvFile(path.join(repoRoot, '.env.test'))
loadDotenvFile(path.join(repoRoot, '.env'))

/**
 * Per-chain metadata — keep in sync with test/chain/chains/*.ts
 * wait-anvil checks eth_chainId matches `expectedChainId` (catches plain Anvil 31337).
 */
const CHAINS = {
  sepolia: {
    expectedChainId: 11155111,
    defaultPort: 8545,
    buildForkUrl: (key) => `https://eth-sepolia.g.alchemy.com/v2/${key}`,
  },
}

function getKey() {
  return (
    process.env.ALCHEMY_API_KEY?.trim() ||
    process.env.VITE_ALCHEMY_RPC_KEY?.trim() ||
    ''
  )
}

function sepoliaForkUrlFromEnv() {
  return (
    process.env.TESTCHAIN_FORK_URL_SEPOLIA?.trim() ||
    process.env.TESTCHAIN_FORK_URL?.trim() ||
    ''
  )
}

function cmdDoctor() {
  console.log('[test:chain] doctor')
  const key = getKey()
  const forkOverride = sepoliaForkUrlFromEnv()
  console.log(
    '  .env.test:',
    fs.existsSync(path.join(repoRoot, '.env.test')) ? 'yes' : 'no'
  )
  console.log('  Alchemy key:', key ? 'yes' : 'no')
  console.log(
    '  TESTCHAIN_FORK_URL_* (used only without Alchemy key):',
    forkOverride ? 'yes' : 'no'
  )
  const anvil = spawnSync('anvil', ['--version'], { encoding: 'utf8' })
  if (anvil.status === 0) {
    console.log('  anvil:', (anvil.stdout || anvil.stderr || '').trim() || 'ok')
  } else {
    console.log('  anvil: not found (install Foundry: https://getfoundry.sh)')
  }
  console.log('  chains (fork-url):', Object.keys(CHAINS).join(', '))
}

function cmdForkUrl(chain = 'sepolia') {
  const meta = CHAINS[chain]
  if (!meta) {
    console.error(
      `Unknown chain "${chain}". Use: ${Object.keys(CHAINS).join(', ')}`
    )
    process.exit(1)
  }
  const alchemyKey = getKey()
  const fromEnv = sepoliaForkUrlFromEnv()
  let url
  if (alchemyKey) {
    url = meta.buildForkUrl(alchemyKey)
    process.stderr.write(
      '# Alchemy fork URL (preferred when API key is set). If anvil returns 403 origin allowlist, open Alchemy dashboard and allow server/CLI access for this key.\n\n'
    )
  } else if (fromEnv) {
    url = fromEnv
    process.stderr.write(
      '# No Alchemy key — using TESTCHAIN_FORK_URL_* (set ALCHEMY_API_KEY to prefer Alchemy).\n\n'
    )
  } else {
    console.error(
      'Set ALCHEMY_API_KEY / VITE_ALCHEMY_RPC_KEY in .env.test, or TESTCHAIN_FORK_URL_SEPOLIA=https://… (see test/chain/README.md)'
    )
    process.exit(1)
  }
  const port = meta.defaultPort
  process.stdout.write(`${url}\n`)
  process.stderr.write(
    `\n# Paste into a second terminal:\n#   anvil --fork-url "${url}" --port ${port}\n\n`
  )
}

async function cmdWaitAnvil(chain = 'sepolia') {
  const meta = CHAINS[chain]
  if (!meta) {
    console.error(
      `Unknown chain "${chain}". Use: ${Object.keys(CHAINS).join(', ')}`
    )
    process.exit(1)
  }
  const port = meta.defaultPort
  const rpc =
    process.env.TESTCHAIN_RPC_URL?.trim() || `http://127.0.0.1:${port}`
  const deadline =
    Date.now() + (Number(process.env.TESTCHAIN_WAIT_MS) || 60_000)
  const want = meta.expectedChainId
  console.error(
    `[test:chain] waiting for ${rpc} (expect chainId ${want}, not 31337 plain Anvil)`
  )
  for (;;) {
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
      const j = await res.json()
      if (j.result) {
        const got = Number.parseInt(String(j.result), 16)
        if (got !== want) {
          console.error(
            `[test:chain] RPC answered but chainId is ${got} (${j.result}), expected ${want} for "${chain}".`
          )
          if (got === 31337) {
            console.error(
              '  This is plain Anvil without --fork-url. Stop it, then run:\n' +
                '    yarn test:chain:fork-url\n' +
                `    anvil --fork-url "<url>" --port ${port}`
            )
          }
          process.exit(1)
        }
        console.error(
          `[test:chain] OK — ${chain} fork ready (chainId ${j.result})`
        )
        return
      }
    } catch {
      /* retry */
    }
    if (Date.now() > deadline) {
      console.error('[test:chain] timeout waiting for', rpc)
      console.error(
        '  Nothing is listening — wait-anvil does not start Anvil. In another terminal run:\n' +
          '    yarn test:chain:fork-url\n' +
          `    anvil --fork-url "<url>" --port ${port}\n` +
          '  Leave anvil running, then run wait-anvil again.'
      )
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

function printHelp() {
  console.log(`test/chain CLI (run from repo root)

  yarn test:chain:doctor              — .env.test + anvil
  yarn test:chain:fork-url           — print Sepolia fork URL (stdout)
  yarn test:chain:fork-url base-sep  — (when added) other chains
  yarn test:chain:wait-anvil         — Anvil must run first in another terminal; then wait for RPC + correct chainId

Or: node test/chain/cli/run.mjs <command>
`)
}

async function main() {
  const [, , command, arg] = process.argv
  switch (command) {
    case 'doctor':
      cmdDoctor()
      break
    case 'fork-url':
      cmdForkUrl(arg || 'sepolia')
      break
    case 'wait-anvil':
      await cmdWaitAnvil(arg || 'sepolia')
      break
    case 'help':
    case '-h':
    case '--help':
      printHelp()
      break
    default:
      if (command) {
        console.error(`Unknown command: ${command}\n`)
      }
      printHelp()
      process.exit(command ? 1 : 0)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
