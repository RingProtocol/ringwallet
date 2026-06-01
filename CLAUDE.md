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

## Workflows (OpenSpec)

Structured change management via `openspec/` and `.windsurf/workflows/`:

| Command         | What it does                      |
| --------------- | --------------------------------- |
| `/opsx-new`     | Start a new change                |
| `/opsx-propose` | Propose change with all artifacts |
| `/opsx-apply`   | Implement tasks from a change     |
| `/opsx-verify`  | Verify implementation             |
| `/opsx-sync`    | Sync delta specs to main specs    |
| `/opsx-archive` | Archive completed change          |
| `/opsx-explore` | Think through ideas first         |

## Skill Routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

| Request pattern                    | Skill                          |
| ---------------------------------- | ------------------------------ |
| Product ideas, brainstorming       | office-hours                   |
| Bugs, errors, "why is this broken" | investigate                    |
| Ship, deploy, push, create PR      | ship                           |
| QA, test the site, find bugs       | qa                             |
| Code review, check my diff         | review                         |
| Update docs after shipping         | document-release               |
| Weekly retro                       | retro                          |
| Design system, brand               | design-consultation            |
| Visual audit, design polish        | design-review                  |
| Architecture review                | plan-eng-review                |
| Save progress / resume             | context-save / context-restore |
| Code quality, health check         | health                         |
