# Chain integration tests (`test/chain`)

Fork-based EVM checks with **Anvil** + an upstream Sepolia RPC (often Alchemy). More detail: `documents/testchain/`.

## Prerequisites

- [Foundry](https://getfoundry.sh) — `anvil` on `PATH`
- Repo root `.env.test` with `ALCHEMY_API_KEY` or `VITE_ALCHEMY_RPC_KEY` (template: `documents/testchain/env.test.example`)

## Run flow (Anvil first)

**Anvil is mandatory and you start it yourself.** `yarn test:chain:wait-anvil` only **polls** `http://127.0.0.1:8545`; it does not launch Anvil. If nothing listens on that port, you get a timeout — fix by starting Anvil in **terminal A** and leaving it running; use **terminal B** for the yarn commands below.

| Step | Terminal | Command                                      | Notes                                                                          |
| ---- | -------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | **B**    | `yarn test:chain:fork-url`                   | Prints Sepolia fork URL; use it in step 2                                      |
| 2    | **A**    | `anvil --fork-url "<paste URL>" --port 8545` | **Keep this running.** Not a fork? Stop any plain `anvil` on 8545 first        |
| 3    | B        | `yarn test:chain:doctor`                     | Optional — `.env.test` + `anvil` on PATH                                       |
| 4    | B        | `yarn test:chain:wait-anvil`                 | Optional — confirms chainId is Sepolia (`11155111`), not plain Anvil (`31337`) |
| 5    | B        | `yarn test:chain`                            | Runs Vitest on `test/chain/**/*.spec.ts`                                       |

**Vitest:** type **only** `yarn test:chain`. Extra tokens after it become [filename filters](https://vitest.dev/guide/filtering) → _No test files found_.

Custom RPC:

```bash
TESTCHAIN_RPC_URL=http://127.0.0.1:8546 yarn test:chain
```

## Layout

```
test/chain/
  chains/           # Per-network profiles (extend here)
  lib/              # env, JSON-RPC helpers
  cli/run.mjs       # doctor | fork-url | wait-anvil
  *.spec.ts         # Vitest specs
```

## Adding another network

1. Copy `chains/sepolia.ts`, adjust `chainId` / port / `buildForkRpcUrl`, register in `chains/index.ts`.
2. Mirror metadata in `cli/run.mjs` → `CHAINS`.
3. Add or extend `*.spec.ts`.

## CI

Default `yarn test` does **not** include `test/chain`. Add a job that starts Anvil + runs `yarn test:chain` when you want this in CI.

## Troubleshooting

### `failed to get fork block number` / HTTP **403** — _Unspecified origin not on whitelist_

Alchemy keys for browser apps may **allowlist Origins**; Anvil is not a browser.

1. **Preferred:** In Alchemy dashboard, allow server / non-browser JSON-RPC for that key (wording varies by plan).
2. **No Alchemy key:** use `TESTCHAIN_FORK_URL_SEPOLIA=https://rpc.sepolia.org` (or another HTTPS Sepolia URL) so `fork-url` skips Alchemy.

If a URL with a secret leaked, **rotate the key**.
