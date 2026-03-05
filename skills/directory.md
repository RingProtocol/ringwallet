# Project Architecture (LLM-Oriented)

This document defines the repository layout and conventions. Follow it when adding, moving, or refactoring code.

---

## Directory Layout

```
<repo-root>/
├── apps/                 # Application entrypoints, one per target platform
├── src/                  # Shared code (no platform-specific entrypoints)
├── public/               # Static assets and PWA manifest (keep as-is)
├── docs/                 # Feature design and technical specs
├── task&plan/            # Plans, roadmaps, and task lists
├── dist/                 # Build output (generated; do not commit app code here)
└── skills/               # Agent skills and project conventions
```

---

## 1. Application Code → `apps/`

- **Rule:** All runnable application code lives under `apps/`.
- **Organization:** Use one subdirectory per **target platform** (runtime environment).
- **Examples:**
  - `apps/pwa/` — PWA / Web app (Vite/React SPA, includes PWA config and entrypoints).
  - `apps/extension/` — Browser extension (if added later).
  - `apps/electron/` — Desktop app (if added later).
- **Per-app contents:** Entrypoint (e.g. `main.tsx`, `index.html`), app-specific pages/routes, and any platform-specific config (e.g. `vite.config.ts` for that app). Shared logic must live in `src/` and be imported from there.
- **Naming:** Use short, platform-obvious names (e.g. `pwa`, `extension`, `electron`).

---

## 2. Shared Code → `src/`

- **Rule:** Common code used by more than one app or by a single app but reusable (e.g. services, utils, components, contexts) lives in `src/`.
- **Do not:** Put application entrypoints or platform-specific bootstrap in `src/`. Entrypoints belong in `apps/<platform>/`.
- **Typical contents:**
  - `src/components/` — Reusable UI components.
  - `src/contexts/` — React (or other) context providers.
  - `src/services/` — Business logic, API clients, wallet/passkey services.
  - `src/services/devices/` — Device detection & platform compatibility helpers (e.g. iOS/Android feature probing, browser capability checks).
  - `src/utils/` — Pure helpers (e.g. `CharUtils`).
  - `src/hooks/` — Shared hooks (if any).
  - `src/constants/` or `src/config/` — Shared constants and config (non-secret).
- **Imports:** Code in `apps/<platform>/` imports from `src/` (e.g. `import { X } from '@/...'` or relative paths depending on your alias setup). Do not put app-only entry logic in `src/`.

---

## 3. PWA-Related Files — Keep Current Location

- **Rule:** PWA assets and config can stay where they are.
- **Typical locations (no need to move for architecture compliance):**
  - `public/manifest.json` — Web app manifest.
  - `public/icons/` — PWA icons.
  - Service worker and Workbox output (e.g. under `dist/` or as configured by `vite-plugin-pwa`) — keep current setup.
- The **PWA/web** app lives under `apps/pwa/`. Its `vite.config.js` references `public/` at the project root via `publicDir`. PWA manifest and icons stay in `public/`.

---

## 4. Design & Specs → `docs/`

- **Rule:** Detailed feature designs and technical specifications go in `docs/`.
- **Use for:** How a feature works, API contracts, env/config guides, factory/address guides, ADRs, or any document that describes “what” and “how” rather than task lists.
- **Examples (aligned with your repo):**
  - `docs/FACTORY-ADDRESS-GUIDE.md`
  - `docs/ENV-CONFIG-GUIDE.md`
  - New files like `docs/passkey-flow.md`, `docs/wallet-service-api.md`, etc.
- **Format:** Markdown; add a short title and optional TOC for long docs. Do not put executable code or task lists here; use `task&plan/` for the latter.

---

## 5. Plans & Task Lists → `task&plan/`

- **Rule:** Roadmaps, task breakdowns, and plan documents go in `task&plan/`.
- **Use for:** TODO lists, sprint/iteration plans, migration plans, and high-level “what to do next.”
- **Example:** `task&plan/todos.md`
- **Not for:** Detailed technical design (that belongs in `docs/`).

---

## Quick Reference for Agents

| Purpose                         | Location        | Notes                                      |
|---------------------------------|-----------------|--------------------------------------------|
| New app for a platform          | `apps/<platform>/` | One folder per platform (pwa, extension, …). |
| Shared components, services, utils | `src/`          | No app entrypoints in `src/`.              |
| Device detection & compatibility   | `src/services/devices/` | Platform probing, browser capability checks. |
| PWA manifest, icons, SW         | `public/` (and build output) | Keep current layout unless explicitly refactoring. |
| Feature/technical design        | `docs/`         | Specs, guides, ADRs.                        |
| Task lists and plans            | `task&plan/`    | TODOs, roadmaps, migration plans.          |

When in doubt: **entrypoints and platform-specific app code → `apps/`**; **reusable logic and UI → `src/`**; **design docs → `docs/`**; **plans/tasks → `task&plan/`**.
