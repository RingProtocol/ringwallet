# Ring Wallet — Project Context for AI Agents

> This file is the primary context source for all AI coding agents working on this repository.
> Read it before making any code changes.

---

## 1. What This Project Is

**Ring Wallet** is a self-custody PWA crypto wallet with the following core traits:

- **No password, no mnemonic** — the user's identity and key material are protected by Passkey (WebAuthn biometric). The `masterSeed` is embedded in the WebAuthn `userHandle` and never stored on any server.
- **Self-custody** — private keys are derived locally in the browser from `masterSeed` at runtime and held in memory only. They are never persisted or sent to any server.
- **No extra fee** — the wallet does not add fees on top of network gas costs.
- **Third-party DApp integration** — the wallet includes a built-in DApp browser and a wallet bridge (`walletBridge`) that exposes a JSON-RPC provider interface to embedded DApps. New DApp features go under `src/features/dapps/`.
- **Multi-chain** — currently supports EVM chains (Ethereum, Optimism, Arbitrum, Polygon). Solana support is planned. See `docs/multichain/` for chain-specific integration designs.

---

## 2. Core Constraints (Non-Negotiable)

| Constraint | Detail |
|------------|--------|
| **No self-built server dependency** | Wallet functions must work without running a proprietary backend. RPC calls go to public or free-tier third-party nodes (e.g. Helius for Solana, Alchemy/public for EVM). The only server-side code is `src/server/` (Neon DB, proxy), which is optional infrastructure and must not be required for key operations. |
| **No third-party wallet app** | The wallet is standalone. Do not add features that require Phantom, MetaMask, or any external wallet extension/app to be installed. |
| **Keys never leave the browser** | Never add code that sends raw private keys or the `masterSeed` over the network. Signing always happens client-side. |
| **Passkey as the only auth gate** | User identity and seed recovery depend solely on WebAuthn (`passkeyService.ts`). Do not introduce alternative auth flows (OAuth, email/password, etc.) without explicit approval. |

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Next.js (App Router) + TypeScript |
| Styling | CSS Modules (co-located `.css` files) |
| EVM | `ethers.js` v6 |
| Solana (planned) | `@solana/web3.js` v1 + `ed25519-hd-key` |
| Key derivation — EVM | BIP32/secp256k1 via `ethers.HDNodeWallet.fromSeed()`, path `m/44'/60'/0'/0/${i}` |
| Key derivation — Solana | SLIP-0010/Ed25519 via `ed25519-hd-key`, path `m/44'/501'/${i}'/0'` |
| Auth | WebAuthn (Passkey) via `passkeyService.ts` |
| Package manager | **yarn** (always use yarn, not npm) |
| Build | Vite (per-app config in `apps/<platform>/`) |

---

## 4. Directory Rules

> Full spec: `docs/skills/directory.md` — read it before adding or moving files.

### Quick Reference

| What you're adding | Where it goes |
|--------------------|---------------|
| New platform entrypoint (PWA, extension, electron) | `apps/<platform>/` |
| Shared UI component | `src/components/` |
| Business logic / API client / wallet service | `src/services/` |
| Device/browser detection helpers | `src/services/devices/` |
| React context providers | `src/contexts/` |
| Pure utility functions | `src/utils/` |
| Shared hooks | `src/hooks/` |
| Shared constants / non-secret config | `src/constants/` or `src/config/` |
| DApp browser feature code | `src/features/dapps/` |
| Feature technical design / spec | `docs/` |
| Task lists / roadmaps / plans | `task&plan/` |
| PWA manifest, icons, service worker | `public/` |

**Rules:**
- `src/` contains shared code only — no platform-specific entrypoints.
- `apps/<platform>/` contains entrypoints and platform-specific config only — business logic belongs in `src/`.
- Keep files small. Extract logic into dedicated functions or files rather than growing large monolithic files.
- New multi-chain integrations: create `src/services/<chain>Service.ts` (e.g. `solanaService.ts`) and corresponding docs in `docs/multichain/<chain>.md`.

---

## 5. Architecture Patterns

### Chain Abstraction

When adding a new chain family (EVM, Solana, Bitcoin, etc.):
1. Extend `ChainFamily` enum in `src/models/ChainType.ts`.
2. Add chain-specific constants to `src/constants/chains.ts` (or create if missing).
3. Create a dedicated service `src/services/<chain>Service.ts`.
4. Branch on `chain.family` in the UI layer — do **not** embed chain-specific logic directly in components.

### Signing Flow

All signing operations must follow this pattern:
1. `PasskeyService.verifyIdentity()` — biometric gate.
2. Derive key material from `masterSeed` (in-memory, not persisted).
3. Sign locally.
4. Broadcast to RPC node.

### DApp Integration

- DApps are injected via `walletBridge` (`src/features/dapps/services/walletBridge.ts`).
- New RPC methods exposed to DApps go in `src/features/dapps/constants/rpcMethods.ts`.
- Approval dialogs go in `src/features/dapps/components/`.

---

## 6. Code Style

- TypeScript strict mode — avoid `any`.
- No inline platform/chain-specific logic in UI components; use service abstractions.
- Co-locate `.css` modules with their component file.
- Do not add comments that just narrate what the code does. Comments should only explain non-obvious intent or constraints.
- Prefer `yarn` for all package operations.
