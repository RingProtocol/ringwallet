# Skill: Add a New EVM Chain Local Simulation Test

Use this guide when adding local Anvil-based integration tests for a new EVM-compatible chain.

## Prerequisites

- [Foundry](https://getfoundry.sh) installed (`anvil` in PATH)
- The chain's official `chainId` (e.g. from chainlist.org)

## Step 1 — Pick a free port

Current port assignments:

| Chain       | chainId   | Port |
| ----------- | --------- | ---- |
| Sepolia     | 11155111  | 8545 |
| Hyperliquid | 998       | 8546 |
| Tron        | 728126428 | 8547 |
| Optimism    | 10        | 8548 |
| Arbitrum    | 42161     | 8549 |
| Polygon     | 137       | 8550 |

Pick the next available port (8551, 8552, …).

## Step 2 — Create a chain profile

Create `test/simulation/evm/chains/<chainname>.ts`:

```ts
import type { ChainTestProfile } from './types'

export const <chainname>Profile: ChainTestProfile = {
  id: '<chainname>',
  displayName: '<Display Name>',
  chainId: <CHAIN_ID>,
  defaultAnvilPort: <PORT>,
  buildForkRpcUrl() {
    return null   // use null for fresh local chain; return a URL string to enable forking
  },
}
```

## Step 3 — Register the profile

Edit `test/simulation/evm/chains/index.ts`:

1. Import: `import { <chainname>Profile } from './<chainname>'`
2. Add to `registry`: `<chainname>: <chainname>Profile,`
3. Add to the `export {}` at the bottom.

## Step 4 — Create the spec file

Create `test/simulation/evm/<chainname>.local.spec.ts` by copying `hyperliquid.local.spec.ts` and:

- Change `getChainProfile('hyperliquid')` → `getChainProfile('<chainname>')`
- Change `process.env.TESTCHAIN_RPC_URL_HYPERLIQUID` → `process.env.TESTCHAIN_RPC_URL_<CHAINNAME>`
- Update the `Chain` object returned by the helper function (symbol, explorer URL)
- Rename the local helper function to match the chain (e.g. `optimismLocalChain`)
- Update the `describe` block label and `localHint` message

The standard test suite covers:

- `eth_chainId` matches profile
- `eth_gasPrice` returns positive wei
- `eth_getBlockByNumber` latest block has expected fields
- Anvil dev account #0 has > 1000 native tokens
- Sequential nonce on mined tx
- Native transfer from Anvil dev account succeeds
- `EvmChainPlugin`: derive from `masterSeed` → sign EIP-1559 tx → broadcast
- `EvmWalletService.signTransaction` + `broadcastEOATransaction`

## Step 5 — Add Anvil startup to test-prepare

Edit `scripts/test-prepare.mjs` — add a new block after the last Anvil section:

```js
// --- <ChainName> (fresh local chain, no fork)
const <chainname>Port = <PORT>
if (await waitAnvilReady(<chainname>Port, 1500)) {
  console.log(`[test:prepare] EVM: port ${<chainname>Port} already serving JSON-RPC (skip <ChainName>).`)
} else {
  const proc = spawn(
    'anvil',
    ['--chain-id', '<CHAIN_ID>', '--port', String(<chainname>Port), '--silent'],
    { detached: true, stdio: 'ignore', cwd: repoRoot }
  )
  proc.unref()
  console.log(`[test:prepare] EVM: spawned anvil chainId=<CHAIN_ID> port=${<chainname>Port} (pid ${proc.pid})`)
  const ok = await waitAnvilReady(<chainname>Port)
  console.log(ok ? `[test:prepare] EVM: <ChainName> anvil ready on ${<chainname>Port}.`
                 : `[test:prepare] EVM: <ChainName> anvil on ${<chainname>Port} not ready in time.`)
}
```

Also update the comment header and the final log line listing all active ports.

## Step 6 — Add a package.json script

```json
"test:chain:<chainname>": "vitest run --config vitest.simulation.evm.config.ts test/simulation/evm/<chainname>.local.spec.ts",
```

## Step 7 — Verify

```sh
# Start all local nodes (idempotent)
yarn test:prepare

# Run the new chain's tests
yarn test:chain:<chainname>
```

All tests should pass. If the Anvil RPC is unreachable the suite prints the exact `anvil` command to run manually.
