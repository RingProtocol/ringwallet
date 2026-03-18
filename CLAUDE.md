# Ring Wallet — Project Context for AI Agents

> This file is the primary context source for all AI coding agents working on this repository.
> Read it before making any code changes.

---

## 1. What This Project Is

**Ring Wallet** is a self-custody PWA crypto wallet:

- **No password, no mnemonic** — user identity and key material are protected by Passkey (WebAuthn biometric). The 32-byte `masterSeed` is embedded in the WebAuthn `userHandle` and never stored on any server.
- **Self-custody** — private keys are derived locally in the browser from `masterSeed` at runtime and held in memory only.
- **No extra fee** — the wallet does not add fees on top of network gas costs.
- **Multi-chain** — EVM chains (Ethereum, Optimism, Arbitrum, Polygon) + Solana (mainnet & devnet).
- **DApp browser** — built-in iframe-based DApp browser with a `WalletBridge` that exposes EIP-1193 JSON-RPC to embedded DApps.
- **Multi-platform** — PWA (`apps/pwa/`) is the primary target; Chrome extension (`apps/extension/`) also exists.

---

## 2. Core Constraints (Non-Negotiable)

| Constraint | Detail |
|------------|--------|
| **No self-built server dependency** | Wallet functions must work without a proprietary backend. RPC calls go to public/free-tier nodes. Server code in `src/server/` is optional infrastructure. |
| **No third-party wallet app** | Do not add features requiring Phantom, MetaMask, or any external wallet. |
| **Keys never leave the browser** | Never send raw private keys or `masterSeed` over the network. Signing is always client-side. |
| **Passkey as the only auth gate** | No alternative auth flows (OAuth, email/password, etc.) without explicit approval. |

---

## 3. Architecture Overview

### Runtime Data Flow

```
Passkey (WebAuthn)
  │  register: masterSeed → userHandle (32-byte seed + username)
  │  login:    userHandle → masterSeed (extracted from first 32 bytes)
  ▼
AuthContext (src/contexts/AuthContext.tsx)
  │  — single React context that holds ALL global state
  │  — on login: derives EVM wallets + Solana wallets from masterSeed
  │  — manages: user, wallets[], solanaWallets[], activeChain, activeWalletIndex
  │  — chain list loaded from DEFAULT_CHAINS (src/config/chains.ts) + /chainid.json at boot
  ▼
┌─────────────┬──────────────────┐
│  EVM path   │  Solana path     │
├─────────────┼──────────────────┤
│ WalletService│ SolanaKeyService │  ← key derivation (BIP32 / SLIP-0010)
│ ethers.js v6 │ @solana/web3.js  │
│ HD path:     │ HD path:         │
│ m/44'/60'/   │ m/44'/501'/      │
│   0'/0/{i}   │   {i}'/0'        │
└──────┬──────┴────────┬─────────┘
       │               │
       ▼               ▼
  sign & broadcast   SolanaService  ← send SOL, estimate fee, airdrop (devnet)
```

### Key Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| **Chain config** | `src/config/chains.ts` | `DEFAULT_CHAINS` array and RPC URL resolution (env override → fallback). All chain definitions live here; `AuthContext` imports `DEFAULT_CHAINS`. |
| **AuthContext** | `src/contexts/AuthContext.tsx` | The only React context. Holds user session, EVM wallets, Solana wallets, active chain/wallet selection. All components consume this via `useAuth()`. |
| **PasskeyService** | `src/services/passkeyService.ts` | WebAuthn register/login/verifyIdentity/signChallenge. Extracts `masterSeed` from `userHandle`. Stores COSE public key in localStorage for EIP-7951. |
| **WalletService** | `src/services/walletService.ts` | EVM wallet: `deriveWallets()` (BIP32), `signTransaction()` (EOA), `signEIP7951Transaction()` (smart account via Passkey), `broadcastEOATransaction()`, `broadcastSmartAccountTransaction()`. |
| **SolanaKeyService** | `src/services/solanaKeyService.ts` | Solana key derivation via SLIP-0010 / Ed25519. `deriveWallets()`, `deriveKeypair()`. |
| **SolanaService** | `src/services/solanaService.ts` | Solana on-chain ops: `getBalance()`, `sendSOL()`, `estimateFee()`, `requestAirdrop()`. |
| **SolanaTokenService** | `src/services/solanaTokenService.ts` | SPL token balance/transfer operations. |
| **WalletBridge** | `src/features/dapps/services/walletBridge.ts` | DApp iframe ↔ wallet communication. Implements EIP-1193 provider via `postMessage`. Routes read-only calls to RPC, approval-required calls (tx, sign) through `ApprovalDialog`. |
| **DApp components** | `src/features/dapps/components/` | `DAppsPage`, `DAppList`, `DAppCard`, `DAppContainer` (iframe host), `ApprovalDialog`. |
| **RPC methods** | `src/features/dapps/constants/rpcMethods.ts` | Whitelists: `READ_ONLY_METHODS`, `APPROVAL_METHODS`, `LOCAL_METHODS`, `RPC_ERRORS`. |

### Platform Entrypoints

| Platform | Entrypoint | Note |
|----------|-----------|------|
| PWA (primary) | `apps/pwa/App.tsx` → wraps `<AuthProvider>` around `<AppContent>` | Next.js serves via `app/page.tsx` → `<App />` |
| Extension | `apps/extension/App.tsx` → similar structure | Built with separate Vite config, outputs to Chrome extension format |

### Server-Side (Optional — Next.js API Routes)

| Route | Purpose |
|-------|---------|
| `app/api/v1/dapps/route.ts` | Public DApp list API (reads from Neon DB) |
| `app/api/admin/*` | Admin panel CRUD for DApp catalog |
| `app/api/health/route.ts` | Health check |

### Wallet Types & Signing Schemes

- **EOA** (`WalletType.EOA`) — standard externally-owned account. Default. Uses secp256k1 signing via ethers.js.
- **SmartContract** (`WalletType.SmartContract`) — EIP-4337 smart account with EIP-7951 Passkey-native signing (secp256r1). Uses `bundlerUrl` + `entryPoint` from chain config.

### Session Persistence

Login state (including `masterSeed`) is serialized to `localStorage` key `wallet_login_state` with a 24h TTL. On page reload, `AuthContext` restores from storage and re-derives all wallets. `publicKey` (COSE format) is stored separately under `new_wallet_pk_{credentialId}` for EIP-7951 signature verification.

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Next.js (App Router) + TypeScript |
| Styling | CSS Modules (co-located `.css` files) |
| EVM | `ethers.js` v6 |
| Solana | `@solana/web3.js` v1 + `ed25519-hd-key` |
| Auth | WebAuthn (Passkey) via `passkeyService.ts` |
| Package manager | **yarn** (always use yarn, not npm) |
| Build | Vite (per-platform config in `apps/<platform>/`) |

---

## 5. Directory Layout

| What you're adding | Where it goes |
|--------------------|---------------|
| New platform entrypoint (PWA, extension, electron) | `apps/<platform>/` |
| Shared UI component | `src/components/` |
| Business logic / wallet service | `src/services/` |
| Device/browser detection helpers | `src/services/devices/` |
| React context providers | `src/contexts/` |
| Chain config / shared non-secret config | `src/config/` |
| Pure utility functions | `src/utils/` |
| Shared hooks | `src/hooks/` |
| DApp browser feature code | `src/features/dapps/` |
| Feature technical design / spec | `docs/` |
| Task lists / roadmaps / plans | `task&plan/` |
| PWA manifest, icons, service worker | `public/` |

**Rules:**
- `src/` contains shared code only — no platform-specific entrypoints.
- `apps/<platform>/` contains entrypoints and platform-specific config only — business logic belongs in `src/`.
- Keep files small. Extract logic into dedicated functions or files.
- New multi-chain integrations: create `src/services/<chain>Service.ts` and `src/services/<chain>KeyService.ts`.

---

## 6. Architecture Patterns

### Chain Abstraction

When adding a new chain family:
1. Extend `ChainFamily` enum and `Chain` interface in `src/models/ChainType.ts`.
2. Create `src/services/<chain>KeyService.ts` (key derivation) and `src/services/<chain>Service.ts` (on-chain ops).
3. Add chain entries + env overrides to `DEFAULT_CHAINS` in `src/config/chains.ts`.
4. Branch on `activeChain.family` in the UI layer — do **not** embed chain-specific logic directly in components.

### Signing Flow

1. `PasskeyService.verifyIdentity()` — biometric gate.
2. Derive key material from `masterSeed` (in-memory, not persisted).
3. Sign locally (`WalletService.signTransaction` for EVM, `SolanaService.sendSOL` for Solana).
4. Broadcast to RPC node.

### DApp Integration

- DApps are loaded in an `<iframe>` inside `DAppContainer`.
- `WalletBridge` attaches to the iframe and handles `postMessage` communication.
- Read-only RPC methods are forwarded directly; approval-required methods trigger `ApprovalDialog`.

---

## 7. Dormant / Unused Code

| Path | Status | Note |
|------|--------|------|
| `src/server/proxy.ts`, `app/api/v1/proxy/route.ts`, `app/api/v1/proxy-asset/route.ts` | **Unused — do not touch** | Server-side HTML-rewriting proxy for the DApp browser. Currently disabled and not called by any client code. The implementation is fragile. Do not wire it up, refactor it, or add features to it unless explicitly asked. |

---

## 8. Code Style

- TypeScript strict mode — avoid `any`.
- No inline platform/chain-specific logic in UI components; use service abstractions.
- Co-locate `.css` modules with their component file.
- Do not add comments that just narrate what the code does. Comments should only explain non-obvious intent or constraints.
- Prefer `yarn` for all package operations.
