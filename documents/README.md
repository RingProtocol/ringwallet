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
  auth/               ← authentication & identity
    login.md
    biometric.md
  assets/             ← balances, tokens, transactions
    balance.md
    transaction.md
  dapp/               ← DApp browser & integration
    dapp-integration.md
  infra/              ← RPC, logos, cross-cutting infrastructure
    rpc.md
    logo.md
  pages/              ← per-page UI specs
    list+loadmore.md
    mainpages.md
    page-style.md
    popup.md
    tokendetail.md
  chains/             ← per-chain feature specs
    btc.md
    doge.md
    evm.md
    solana.md
    tron.rule.md
  bugs/               ← tracked bugs (bug1/, bug2/, ...)
```

## tests/ layout

```
tests/
  e2e/                ← end-to-end test docs
    playwright.md
  chains/             ← per-chain test cases
    btc-testcase.md
    solana-testcase.md
  testchain/          ← local test node setup
    README.md
    anvil-fork-runbook.md
    env.test.example
```
