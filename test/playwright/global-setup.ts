import { execSync, spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { E2E_CONFIG_EVM, EVM_TESTNET_CHAINS } from './env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

/** Path used to pass anvil PIDs to global-teardown.ts */
export const ANVIL_PIDS_FILE = path.join(
  tmpdir(),
  'playwright-e2e-anvil-pids.json'
)

async function waitForAnvil(port: number, timeoutMs = 60_000): Promise<void> {
  const url = `http://127.0.0.1:${port}`
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: [],
        }),
      })
      const json = (await res.json()) as { result?: string }
      if (json.result) return
    } catch {
      /* not ready yet — retry */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(
    `[globalSetup] Anvil on port ${port} did not start within ${timeoutMs}ms`
  )
}

async function setBalance(
  port: number,
  address: string,
  ether: bigint
): Promise<void> {
  const weiHex = '0x' + ether.toString(16)
  await fetch(`http://127.0.0.1:${port}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'anvil_setBalance',
      params: [address, weiHex],
    }),
  })
}

/** Kill any process already listening on a port so a fresh anvil can bind. */
function freePort(port: number): void {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid, 10), 'SIGKILL')
      } catch {
        /* already gone */
      }
    }
    if (pids.length > 0) {
      // Brief pause for the OS to release the port
      execSync('sleep 0.3')
      console.log(
        `[globalSetup] freed port ${port} (killed pid(s): ${pids.join(', ')})`
      )
    }
  } catch {
    /* no process on that port — nothing to do */
  }
}

export default async function globalSetup(): Promise<void> {
  const pids: number[] = []

  for (const chain of EVM_TESTNET_CHAINS) {
    // Kill any stale anvil from a previous run before spawning a new one.
    freePort(chain.anvilPort)

    const proc = spawn(
      'node',
      [
        path.join(__dirname, 'scripts', 'start-anvil.mjs'),
        String(chain.chainId),
        String(chain.anvilPort),
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit', // show anvil logs in terminal
        detached: false,
      }
    )

    if (proc.pid == null) {
      throw new Error(
        `[globalSetup] Failed to spawn start-anvil.mjs for chain ${chain.chainId}`
      )
    }

    pids.push(proc.pid)
    console.log(
      `[globalSetup] spawned start-anvil.mjs (pid=${proc.pid}) for chain ${chain.chainId} on port ${chain.anvilPort}`
    )

    // Wait for anvil to answer JSON-RPC (start-anvil.mjs may still be setting balance;
    // we call setBalance here too so globalSetup never returns before funds are ready).
    await waitForAnvil(chain.anvilPort)
    await setBalance(
      chain.anvilPort,
      E2E_CONFIG_EVM.address0,
      100n * 10n ** 18n
    )
    console.log(
      `[globalSetup] anvil ready and funded on port ${chain.anvilPort} (chainId=${chain.chainId})`
    )
  }

  // Persist PIDs so global-teardown.ts can kill the wrappers (which kill anvil via SIGTERM handler)
  writeFileSync(ANVIL_PIDS_FILE, JSON.stringify(pids))
}
