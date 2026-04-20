# Multichain integration tests

These specs use [`vitest.multichain.config.ts`](../../vitest.multichain.config.ts) (not the default `yarn test` unit suite).

**Prepare all local stacks (Bitcoin Docker + Solana validator + EVM Anvil)** when you have Docker, Solana CLI, and Foundry `anvil` installed:

```bash
yarn test:prepare
```

See [`scripts/test-prepare.mjs`](../../scripts/test-prepare.mjs). Components are skipped if the tool is missing or the port is already in use.

| Suite                                 | What it needs                                                                            | Typical CI                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `solana.local.integration.spec.ts`    | `solana-test-validator` on `127.0.0.1:8899`                                              | PR job `solana-local` in [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml)      |
| `bitcoin.regtest.integration.spec.ts` | Docker: `test/bitcoin-regtest/docker-compose.yml`, then `esplora-proxy.mjs` on port 3002 | Nightly [`.github/workflows/nightly-multichain.yml`](../../.github/workflows/nightly-multichain.yml) |

## Solana (local)

```bash
# Terminal 1
solana-test-validator --reset

# Terminal 2
export SOLANA_LOCAL_TEST=1
export TEST_SOLANA_RPC_URL=http://127.0.0.1:8899
yarn test:multichain:solana-local
```

Or use `yarn test:multichain:solana-local` after the validator is already up (the script waits for RPC).

## Bitcoin (regtest)

Prerequisites: Docker running; container name must be `ring-bitcoind-regtest` (from the compose file below).

```bash
docker compose -f test/bitcoin-regtest/docker-compose.yml up -d
# Required — without this, Vitest skips the suite entirely.
export RUN_BITCOIN_REGTEST=1
# Optional; default is http://127.0.0.1:3002 (must match ESPLORA_PROXY_PORT in the spec).
export TEST_BITCOIN_INDEXER_URL=http://127.0.0.1:3002
yarn test:multichain:bitcoin-regtest
```

The integration spec starts [`test/bitcoin-regtest/esplora-proxy.mjs`](../../test/bitcoin-regtest/esplora-proxy.mjs) in `beforeAll` (do not start a second copy on the same port). The proxy implements the Esplora HTTP surface `BitcoinService` uses (`/address/...`, `POST /tx`, …) on top of `bitcoin-cli` (`scantxoutset`, `sendrawtransaction`).

## Playwright Solana route proxy

With `SOLANA_E2E_LOCAL=1`, [`test/Playwright/fixtures/wallet.fixture.ts`](../Playwright/fixtures/wallet.fixture.ts) proxies devnet RPC URLs to `127.0.0.1:8899`. Optional smoke: `test/Playwright/tests/solana-smoke.spec.ts` (also requires `SOLANA_E2E_LOCAL=1`).
