# documents/

Three directories, three roles:

| Directory | Owner   | Content                                                                  |
| --------- | ------- | ------------------------------------------------------------------------ |
| `specs/`  | **You** | Feature requirements, user stories, bug reports, page specs, chain specs |
| `tests/`  | AI      | Test cases generated from specs                                          |
| `tech/`   | AI      | Architecture decisions, engineering constraints                          |

## Workflow

1. Add or update a file in `specs/` describing what you want.
2. Tell the AI to implement it — the AI reads your spec, writes code, and updates `tests/` and `tech/` as needed.
3. You only need to manage `specs/`.

## specs/ layout

```
specs/
  balance.md          ← feature specs (top-level = cross-cutting concerns)
  biometric.md
  dapp-integration.md
  login.md
  rpc.md
  transaction.md
  pages/              ← per-page UI specs
  chains/             ← per-chain feature specs (btc, evm, solana, doge, tron)
  bugs/               ← tracked bugs (bug1/, bug2/, ...)
```
