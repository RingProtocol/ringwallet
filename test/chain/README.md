# Chain integration tests (`test/chain`)

Fork-based EVM checks with **Anvil** + **Alchemy** (see `documents/testchain/`).  
Designed for **step-by-step** workflows: prepare RPC in one terminal, run commands in another.

## Prerequisites

- [Foundry](https://getfoundry.sh) (`anvil` on `PATH`)
- `.env.test` at repo root with `ALCHEMY_API_KEY` or `VITE_ALCHEMY_RPC_KEY`  
  (template: `documents/testchain/env.test.example`)

## You must start Anvil yourself (`wait-anvil` does not)

- **`yarn test:chain:wait-anvil` does not start `anvil`.** It only waits for an RPC that is **already** listening (default `http://127.0.0.1:8545`).
- If nothing is bound to that port, you get **`timeout waiting for http://127.0.0.1:8545`**. Fix: open **another terminal**, run the `anvil --fork-url "https://eth-sepolia.g.alchemy.com/v2/key"` line from step 3 below, and **leave it running**.
- Usual layout: **terminal A** = Anvil (long-running); **terminal B** = `wait-anvil` / `test:chain`.

## Commands (recommended order)

Copy **only** the command in the middle column — extra words after a space become [Vitest’s filename filter](https://vitest.dev/guide/filtering) and can yield _No test files found_.

| Step | Terminal | Command                      | What it does                                                                                                                        |
| ---- | -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1    | B        | `yarn test:chain:doctor`     | Confirms `.env.test` + `anvil` on PATH                                                                                              |
| 2    | B        | `yarn test:chain:fork-url`   | Prints fork URL (stdout) + example `anvil` line (stderr)                                                                            |
| 3    | **A**    | _(manual)_                   | **Start Anvil and keep it running:** stop any plain `anvil` on that port, then `anvil --fork-url "…" --port 8545` (URL from step 2) |
| 4    | B        | `yarn test:chain:wait-anvil` | Optional: A is up **and** chainId is Sepolia (`11155111`); rejects 31337 plain Anvil                                                |
| 5    | B        | `yarn test:chain`            | Runs [Vitest](https://vitest.dev) on `test/chain/**/*.spec.ts`                                                                      |

One-liner after Anvil is up:

```bash
yarn test:chain
```

Custom RPC:

```bash
TESTCHAIN_RPC_URL=http://127.0.0.1:8546 yarn test:chain
```

## Layout

```
test/chain/
  chains/           # Per-network profiles (extend here)
    types.ts
    sepolia.ts
    index.ts        # registry
  lib/              # env, JSON-RPC helpers
  cli/run.mjs       # doctor | fork-url | wait-anvil
  *.spec.ts         # Vitest specs (one file per milestone)
```

## Adding another network

1. Copy `chains/sepolia.ts` → e.g. `chains/baseSepolia.ts` with new `chainId`, port, `buildForkRpcUrl`.
2. Register in `chains/index.ts`.
3. Add the same metadata to `cli/run.mjs` → `CHAINS` (`expectedChainId`, `defaultPort`, `buildForkUrl`).
4. Add `chains/yourchain.spec.ts` or extend shared specs.

## CI

`yarn test` (default Vitest config) **does not** run `test/chain`.  
Chain tests need a running Anvil job; wire that in CI separately when ready.

## Troubleshooting

### `failed to get fork block number` / HTTP **403** — _Unspecified origin not on whitelist_

Alchemy (and some providers) **allowlist HTTP Origins** for keys meant for browser apps. **Anvil / Foundry** are not browsers, so the request can be rejected.

**Fix (pick one):**

1. **Preferred:** In **Alchemy dashboard**, adjust the app/key so **non-browser / server** JSON-RPC is allowed (disable strict origin allowlist or add rules for Foundry/anvil — product UI varies by plan).
2. **Without an Alchemy key:** unset / omit `ALCHEMY_API_KEY` and `VITE_ALCHEMY_RPC_KEY` for fork-only use, then set e.g. `TESTCHAIN_FORK_URL_SEPOLIA=https://rpc.sepolia.org` — `fork-url` will use that fallback.
3. Use another provider’s Sepolia HTTPS URL in `TESTCHAIN_FORK_URL_SEPOLIA` the same way (still only used when no Alchemy key is present).

`fork-url` resolution is **Alchemy first** whenever a key exists in env.

If an RPC URL with a secret was leaked, **rotate the key** in the provider dashboard.
