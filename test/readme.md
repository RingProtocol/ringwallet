# Ring Wallet — Test Architecture

## Quick start

```bash
yarn test                # Unit tests (fast, no network)
yarn test:multichain     # Multi-chain RPC smoke tests (network)
yarn test:chain          # EVM fork tests (requires local Anvil)
```

## Directory layout

```
test/
├── unit/                          ← yarn test (vitest.config.ts)
│   ├── features/dapps/            # DApp browser: RPC method sets, WalletBridge
│   ├── models/                    # Data models: ChainType, getPrimaryRpcUrl
│   ├── server/                    # Next.js API routes: dapps, history
│   ├── services/
│   │   ├── chainplugins/          # Plugin registry + per-family plugins (EVM/Solana/Bitcoin/Tron/Cosmos)
│   │   ├── rpc/                   # EvmRpcService: history, balance, fallback
│   │   ├── wallet/                # Key derivation: EVM, Solana, Bitcoin; EvmWalletService signing
│   │   ├── bitcoinService.test.ts # Fork resolution, unit conversion, UTXO coin selection
│   │   ├── solanaService.test.ts  # Balance, sendSOL, fee estimation, airdrop (mocked)
│   │   └── solanaTokenService.test.ts  # SPL token balance/transfer, ATA handling (mocked)
│   └── utils/
│       ├── charUtils.test.ts      # Hex/Base64/COSE key conversion utilities
│       └── tokenStorage.test.ts   # Per-chain token list persistence
│
├── multichain/                    ← yarn test:multichain (vitest.multichain.config.ts)
│   ├── lib/resolveTestRpc.ts      # Alchemy key → per-chain RPC URL builder
│   ├── seed.ts                    # Shared deterministic test seed
│   ├── bitcoin.rpc.spec.ts        # Tip height + BitcoinChainPlugin derive
│   ├── cosmos.rpc.spec.ts         # REST block query + CosmosChainPlugin derive
│   ├── evm.rpc.spec.ts            # Block number, gas price + EvmChainPlugin derive
│   ├── solana.rpc.spec.ts         # Blockhash, balance + SolanaChainPlugin derive
│   └── tron.rpc.spec.ts           # getnowblock + TronChainPlugin derive
│
└── evmchain/                      ← yarn test:chain (vitest.chain.config.ts)
    ├── chains/                    # Per-network profiles (Sepolia; extensible)
    ├── lib/                       # env loader, JSON-RPC helpers, fork URL builder
    ├── cli/run.mjs                # doctor | fork-url | wait-anvil CLI
    └── sepolia.fork.spec.ts       # Full EVM flow: derive → fund → sign → broadcast → receipt
```

## Dev commands

| Command         | What it runs                        | What you get                                             |
| --------------- | ----------------------------------- | -------------------------------------------------------- |
| `yarn dev`      | `next dev` (Next.js dev server)     | PWA frontend + API routes (`/api/*`) on `localhost:3000` |
| `yarn vite:dev` | `vite` (Vite dev server, port 3003) | PWA frontend only on `localhost:3003`, **no** API routes |

Use `yarn dev` for normal development — it serves everything in one origin. Use `yarn vite:dev` when you only need the frontend (e.g. pointing at a remote API or testing the Vite build in isolation).

## Three test tiers

| Tier               | Command                | Config                        | Environment     | Network               | Speed |
| ------------------ | ---------------------- | ----------------------------- | --------------- | --------------------- | ----- |
| **Unit**           | `yarn test`            | `vitest.config.ts`            | Node.js         | None                  | ~2s   |
| **Multichain RPC** | `yarn test:multichain` | `vitest.multichain.config.ts` | Node.js         | Public RPCs / Alchemy | ~30s  |
| **EVM Fork**       | `yarn test:chain`      | `vitest.chain.config.ts`      | Node.js + Anvil | Local fork            | ~60s  |

### Unit tests (`test/unit/`)

Pure logic and mocked-dependency tests. No network calls, no external services. All imports use the `@/` alias (mapped to `src/`).

**Conventions:**

- File naming: `*.test.ts`
- Mirrors `src/` directory structure under `test/unit/`
- Mock external dependencies (`@solana/web3.js`, `@solana/spl-token`, `fetch`, `localStorage`) via `vi.mock()`
- Test IDs use `TC-` prefix for traceability (e.g. `TC-SOL-KEY-01`, `TC-BTC-ADDR-01`)

**What's covered:**

- Key derivation for all 5 chain families (EVM, Solana, Bitcoin, Tron, Cosmos)
- Address validation (valid/invalid, cross-chain rejection)
- Cross-chain key isolation (same seed → different keys per chain)
- Transaction signing (EVM offline, Bitcoin PSBT with mocked UTXOs)
- Unit conversion (sats ↔ BTC, lamports → SOL)
- RPC service input validation and multi-URL failover
- COSE key serialization (WebAuthn/EIP-7951)
- DApp bridge message format and EIP-1193 error codes
- Token storage persistence per chain
- Server-side API route handlers (dapps list, tx history)

### Multichain RPC tests (`test/multichain/`)

Network-dependent smoke tests that verify real RPC endpoints respond correctly. Skippable via `SKIP_MULTICHAIN_INTEGRATION=1`.

**Conventions:**

- File naming: `*.spec.ts`
- Each spec combines RPC connectivity check + chain plugin derivation test
- Uses `withRpcRetry()` for resilience against transient failures
- Shared test seed in `seed.ts` (same as unit tests for determinism)

**RPC configuration:** one `ALCHEMY_API_KEY` in `.env.test` is sufficient — `lib/resolveTestRpc.ts` composes URLs for all chains. Override individual chains with `TEST_SOLANA_RPC_URL`, `TEST_TRON_API_URL`, etc. See `test/multichain/README.md`.

### EVM fork tests (`test/evmchain/`)

End-to-end EVM transaction lifecycle on a local Anvil fork of Sepolia. Requires Foundry (`anvil` on PATH).

**What's covered:**

- `EvmChainPlugin`: masterSeed → derive → sign EIP-1559 tx → broadcast → mine
- `EvmWalletService`: signTransaction + broadcastEOATransaction on fork
- Nonce management, USDC `balanceOf` via `eth_call`

See `test/evmchain/README.md` for setup instructions.

## Shared test seed

All deterministic derivation tests use the same 32-byte seed (SLIP-0010 Test Vector 2):

```
fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2
```

This enables cross-reference of derived addresses across unit, plugin, and integration tests.

## Adding tests

| What you're testing            | Where it goes                                           | Naming                  |
| ------------------------------ | ------------------------------------------------------- | ----------------------- |
| Pure function / mocked service | `test/unit/` (mirror `src/` path)                       | `*.test.ts`             |
| New chain family plugin        | `test/unit/services/chainplugins/` + `test/multichain/` | `.test.ts` + `.spec.ts` |
| EVM on-chain interaction       | `test/evmchain/`                                        | `*.spec.ts`             |
| Server API route               | `test/unit/server/`                                     | `*.test.ts`             |
| UI component                   | `test/unit/components/` (when needed)                   | `*.test.tsx`            |

## CI integration

`yarn test` (unit tests only) runs by default and is safe for CI without external dependencies. Wire `yarn test:multichain` and `yarn test:chain` into CI pipelines when Alchemy keys and Anvil are available.

```bash
# CI pipeline example
yarn test                           # Always: fast, no network
yarn test:multichain                # Optional: needs ALCHEMY_API_KEY
yarn test:chain                     # Optional: needs Anvil + ALCHEMY_API_KEY
```
