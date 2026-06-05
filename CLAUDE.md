# Ring Wallet — AI Agent Context

> Read this before making any code changes. Details live in `documents/`.

disable-model-invocation: true

---

## Product

See `src/components/Introduce.tsx` for product introduction.

### Core Constraints (Non-Negotiable)

- **No self-built server dependency** — wallet works without proprietary backend
- **No third-party wallet app** — no Phantom, MetaMask, etc.
- **Keys never leave the browser** — signing is always client-side
- **Passkey as the only auth gate** — no OAuth, email/password without explicit approval

### Tech Stack

React 18 + Next.js (App Router) + TypeScript, CSS Modules, ethers.js v6, @solana/web3.js v1, WebAuthn (Passkey). **Always use yarn, not npm.** Build: Vite per-platform.

---

## Documents

All product specs, technical architecture, and test cases are in `documents/`. See `documents/README.md` for the full layout.

| What                        | Where                             |
| --------------------------- | --------------------------------- |
| Product specs (features/UI) | `documents/specs/`                |
| — Auth & identity           | `documents/specs/auth/`           |
| — Asset/balance/transaction | `documents/specs/assets/`         |
| — DApp browser              | `documents/specs/dapp/`           |
| — Per-chain specs           | `documents/specs/chains/`         |
| — Per-page UI specs         | `documents/specs/pages/`          |
| — Infra (RPC, logo)         | `documents/specs/infra/`          |
| Technical architecture      | `documents/tech/`                 |
| — Isolated signing Worker   | `documents/tech/signer-worker.md` |
| Test cases (per-chain, e2e) | `documents/tests/`                |
| Test code (unit/simulation) | `test/unit/`, `test/simulation/`  |
| E2E (Playwright)            | `test/playwright/`                |

> **Note:** Card, Swap, Predict (Polymarket), Earn, History 等功能模块的代码已存在，但 `documents/specs/` 中尚无对应 spec。

---

## Code Layout

| What                         | Where                           |
| ---------------------------- | ------------------------------- |
| Platform entrypoints         | `apps/<platform>/`              |
| Shared UI components         | `src/components/`               |
| — Swap                       | `src/components/swap/`          |
| — Predict (Polymarket)       | `src/components/predict/`       |
| — Earn                       | `src/components/earn/`          |
| — Token detail               | `src/components/detail/`        |
| — Transaction                | `src/components/transaction/`   |
| — Common / UI primitives     | `src/components/common/`, `ui/` |
| Feature modules              | `src/features/`                 |
| — Card                       | `src/features/card/`            |
| — Balance                    | `src/features/balance/`         |
| — DApps                      | `src/features/dapps/`           |
| — History                    | `src/features/history/`         |
| Services                     | `src/services/`                 |
| — Chain plugins              | `src/services/chainplugins/`    |
| — RPC                        | `src/services/rpc/`             |
| — Polymarket                 | `src/services/polymarket/`      |
| — Device detection           | `src/services/devices/`         |
| Type definitions             | `src/models/`                   |
| React contexts               | `src/contexts/`                 |
| Chain & shared config        | `src/config/`                   |
| Utilities                    | `src/utils/`                    |
| Hooks                        | `src/hooks/`                    |
| Server API routes (optional) | `app/api/`                      |
| Server-side code             | `src/server/`                   |

**Rules:** `src/` = shared code only. `apps/<platform>/` = entrypoints & platform config only. New chains → `src/services/chainplugins/`.

---

## Development Workflow

- **开发规范**（分层架构、组件化、新增模块/Bug修复步骤）→ `.workflow/readme-tech.md`
- **验证要求**（测试分层、UI bug 必须 Playwright、完成标准）→ `.workflow/readme-verify.md`

---

## Code Style

- TypeScript strict — avoid `any`
- No inline chain-specific logic in UI; use service abstractions
- Co-locate `.css` modules with component
- Comments: only non-obvious intent, not narration
- Use `yarn` for all package operations

---

## Security Architecture

### Worker-Only Seed Isolation (Non-Negotiable)

The main thread **never** holds the plaintext master seed after the initial login handshake.

| Stage         | Main Thread                                                  | Worker                                 |
| ------------- | ------------------------------------------------------------ | -------------------------------------- |
| Passkey login | Extracts raw seed from `userHandle`                          | —                                      |
| Transport     | ECDH-encrypts seed, calls `signerBridge.init()`              | Decrypts, stores XOR-obfuscated        |
| After init    | `secureZero(seed)` → `ringsecurity_masterSeed = undefined`   | Sole owner of seed                     |
| Signing       | Calls `signerBridge.sign*()` → gets tx hex only              | Derives key, signs, returns result     |
| Derivation    | Calls `signerBridge.deriveAddresses()` → gets addresses only | Derives HD accounts, returns addresses |

**Rules:**

- All signing, address derivation, and seed export happen **only** inside `src/workers/signer.worker.ts`
- `signerBridge` (`src/services/account/signerBridge.ts`) is the **only** main-thread interface to the Worker
- `UserData.ringsecurity_masterSeed` is transient during login; set to `undefined` immediately after Worker init
- `UserData.ringsecurity_seedReady` is a boolean flag only — not seed material

### `ringsecurity_` Naming Convention (Mandatory)

All variables, functions, and properties that directly hold or manipulate seed material **must** use the `ringsecurity_` prefix. This enables the supply-chain audit test to detect SDK access.

| Entity                 | Prefixed name                     |
| ---------------------- | --------------------------------- |
| Master seed property   | `ringsecurity_masterSeed`         |
| Seed-ready flag        | `ringsecurity_seedReady`          |
| Worker obfuscated seed | `ringsecurity_obfuscatedSeed`     |
| Worker scramble key    | `ringsecurity_scrambleKey`        |
| XOR scramble function  | `ringsecurity_xorScrambleInPlace` |
| Obfuscate function     | `ringsecurity_obfuscateSeed`      |
| Unscramble function    | `ringsecurity_unscrambleSeed`     |
| Protect function       | `ringsecurity_protectSeed`        |

**When adding a new seed-related variable or function:**

1. Prefix it with `ringsecurity_`
2. Add a matching `severity: 'critical'` pattern to `test/unit/security/supplyChainAudit.test.ts`
3. Generic utilities (`secureZero`, `generateScrambleKey`) are exempt — they handle non-seed buffers too

### Supply-Chain Audit Test

`test/unit/security/supplyChainAudit.test.ts` scans all production `node_modules` for:

- `ringsecurity_` identifier access → **CRITICAL failure** (likely targeted attack)
- `navigator.credentials` hooking → **CRITICAL** (WebAuthn interception)
- `Worker.prototype.postMessage` monkey-patching → **CRITICAL** (seed transport interception)
- `crypto.subtle` override → **CRITICAL** (key material theft)
- Data exfiltration patterns targeting seed keywords → **CRITICAL**
- `eval()` / `new Function()` with variable args → warning (review manually)

If the test fails on a new dependency: do NOT add an allowlist entry without manual security review.

### Biometric Verification on Transfers

`PasskeyService.verifyIdentity()` is called before signing a transfer. It performs a biometric challenge (Face ID / Touch ID) **without** reading or returning the seed or `userHandle`. This confirms the operator is the device owner — it is not a seed-access mechanism.

### Adding New Production Dependencies

Before adding a new `dependencies` entry to `package.json`:

1. Review the package for supply-chain threats
2. Add it to `AUDITED_DEPS` in `test/unit/security/supplyChainAudit.test.ts`
3. Add allowlist entries only after confirming the pattern is benign
4. Run `yarn vitest run test/unit/security/supplyChainAudit.test.ts` to verify

---
