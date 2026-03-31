# Multichain RPC tests (`test/multichain`)

**Not Anvil.** Bitcoin / Solana / Tron smoke tests over the network. No local validator.

## Command

```bash
yarn test:multichain
```

Uses `vitest.multichain.config.ts`. Can be flaky on free public nodes; **one Alchemy key** in `.env.test` is enough to compose provider URLs (see below).

## Alchemy: one key → default URLs

If **`ALCHEMY_API_KEY`** or **`VITE_ALCHEMY_RPC_KEY`** is set in `.env.test` (Vitest loads it), `test/multichain/lib/resolveTestRpc.ts` builds defaults **unless** you set the explicit `TEST_*` URL overrides:

| Chain       | Default URL pattern (key = your API key)                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Solana**  | `https://solana-devnet.g.alchemy.com/v2/<key>` — set `TEST_SOLANA_ALCHEMY_CLUSTER=mainnet` for mainnet-beta host                      |
| **Tron**    | `https://tron-mainnet.g.alchemy.com/v2/<key>` — `POST …/wallet/getnowblock`                                                           |
| **Bitcoin** | JSON-RPC `getblockcount` on `https://bitcoin-testnet.g.alchemy.com/v2/<key>` — set `TEST_BITCOIN_ALCHEMY_NETWORK=mainnet` for mainnet |

You do **not** need separate lines like `TEST_SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/...` if the key is already in `.env.test`; only add them to override host or cluster.

## Optional overrides

| Variable                       | Purpose                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `TEST_SOLANA_RPC_URL`          | Full Solana JSON-RPC URL (wins over Alchemy composition).                                                            |
| `TEST_SOLANA_ALCHEMY_CLUSTER`  | `devnet` (default) or `mainnet` / `mainnet-beta` when using Alchemy without `TEST_SOLANA_RPC_URL`.                   |
| `TEST_TRON_API_URL`            | Tron HTTP API base (e.g. Shasta TronGrid); wins over Alchemy.                                                        |
| `TEST_BITCOIN_INDEXER_URL`     | Esplora REST base (`GET {base}/blocks/tip/height`); if set, **disables** Alchemy Bitcoin JSON-RPC for the tip check. |
| `TEST_BITCOIN_ALCHEMY_NETWORK` | `testnet` (default, testnet3 RPC) or `mainnet` when using Alchemy without Esplora override.                          |
| `SKIP_MULTICHAIN_INTEGRATION`  | `1` = skip this entire suite.                                                                                        |

Details and copy-paste examples: `documents/testchain/env.test.example`.

## What is covered

- **Solana:** `Connection.getLatestBlockhash`, `getBalance`; `SolanaChainPlugin` derive + `isValidAddress`.
- **Bitcoin:** tip height via Esplora **or** Alchemy `getblockcount`; `BitcoinChainPlugin` derive + `isValidAddress`.
- **Tron:** `wallet/getnowblock`; `TronChainPlugin` derive + `isValidAddress`; `signTransaction` still throws (not implemented in app).

EVM fork + Anvil: **`test/evmchain`** (`yarn test:chain`).
