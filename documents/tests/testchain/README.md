# Multi-chain automated testing solution (Testchain)

On-chain integration and E2E for Ring Wallet: use **Anvil to fork the real network** to cover multiple chains and avoid running only local `31337`; funds are provided by Anvil default account or self-deployed ERC20 `mint`, and do not rely on browser Faucet.

---

## 1. Goal

| Ability                    | Practice                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Multi-chain                | Each target chain corresponds to `anvil --fork-url <Alchemy RPC>` (can run multiple ports in parallel)                         |
| Consistent with production | After the fork, `chainId`, precompilation, and common contracts are consistent with remote (only status snapshots are local)   |
| Funds                      | Anvil built-in account private key to native; ERC20 test currency self-deployment + `mint`                                     |
| Wallet connection          | Under the test build, point the target chain **RPC to `http://127.0.0.1:<port>`** (consistent with the forked chain `chainId`) |

---

## 2. Why use Fork instead of just running 31337

- **31337** is a purely local empty chain: it is inconsistent with "each chain supported by the wallet" in terms of chainId, gas behavior, and some opcode/precompilation differences.
- **`anvil --fork-url`**: Execute transactions locally, read status from Alchemy (etc.) snapshot; **chainId is consistent with the fork target**, the same logical chain "Sepolia / Arbitrum / ..." is still selected on the wallet side, only RPC is temporarily changed to local.

---

## 3. Environment variables (`.env.test`)

Read in **Node test script/CI** (do not submit the real key; CI is injected with secret):

| Variable                     | Purpose                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ALCHEMY_API_KEY`            | **Priority**: Use Alchemy Sepolia for `fork-url` when there is a key (please release the CLI/server in the console to avoid anvil 403) |
| `VITE_ALCHEMY_RPC_KEY`       | Parallel with the above, if either exists, **takes precedence Alchemy**                                                                |
| `TESTCHAIN_FORK_URL_SEPOLIA` | **Only used as `anvil --fork-url` when the above key** is not configured (for example, only public RPC is used locally)                |
| `TESTCHAIN_FORK_URL`         | Same as above                                                                                                                          |
| `ANVIL_PORT`                 | Optional, default is `8545`; use `8545`, `8546`… for multi-chain parallelization                                                       |

`yarn test:chain:fork-url`: **has Alchemy key → Alchemy**; otherwise use `TESTCHAIN_FORK_URL_*`.

Wallet **E2E** still works with `VITE_ALCHEMY_RPC_KEY`; **Anvil fork** If encountering 403, see [`test/evmchain/README.md`](../../test/evmchain/README.md) Troubleshooting.

For examples, see the same directory [`env.test.example`](./env.test.example).

---

## 4. Alchemy RPC and `--fork-url` splicing

Just replace the placeholder at the end with key (aligned with the Alchemy form of each chain in `src/config/chains.ts`):

| Fork target      | `FORK_URL` template                                           |
| ---------------- | ------------------------------------------------------------- |
| Ethereum Mainnet | `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| Sepolia          | `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| Arbitrum One     | `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| Arbitrum Sepolia | `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| Optimism         | `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| OP Sepolia       | `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`     |
| Polygon Mainnet  | `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` |
| Polygon Amoy     | `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`    |
| Base             | `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`    |
| Base Sepolia     | `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`    |

If other chains are supported by Alchemy, just change the host according to the official documentation. **Forked chains are not supported** (or non-EVM) are not forced to use this solution, and separate testing strategies (mock/test network direct connection/chain-specific tools) are listed.

Startup example:

```bash
export FORK_URL="https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
anvil --fork-url "$FORK_URL" --port 8545
```

Multi-chain parallelism:

```bash
anvil --fork-url "$FORK_URL_SEPOLIA" --port 8545 &
anvil --fork-url "$FORK_URL_ARBITRUM_SEPOLIA" --port 8546 &
```

---

## 5. How to "connect" the wallet to Fork

1. Start Anvil (with `--fork-url`).
2. In **Test-specific configuration**: Set the first item of `rpcUrl` corresponding to `chainId` to `http://127.0.0.1:<port>` (or override `localStorage` / runtime chain list through `globalSetup` / `page.addInitScript`, depending on the implementation).
3. The user selects the chain consistent with the fork in the UI (such as Sepolia `11155111`), and the actual RPC points to the local.

Note: Transactions on the forked node are not written back to Alchemy; they are only visible locally.

---

## 6. Anvil default account and Native funds

- Anvil is preset with 10 accounts, and the private keys are printed in the startup log (the Foundry document also has a list of fixed test private keys).
- The **native balance** on the forked chain comes from the snapshot: If the test address has no money on the remote test network, you can use any Anvil account private key to make an `eth_sendTransaction` transfer to **your test address** locally; the local state is writable and the balance is valid on the fork (until restarting Anvil).

---

## 7. ERC20: Self-deployment and Mint

Applicable to scenarios where "stability testing of token symbols/unlimited limits is required":

1. Use **Foundry `forge script`** or **ethers.js** to deploy minimalist `ERC20` (OpenZeppelin `ERC20` + `mint`) on fork.
2. `mint(testAddress, amount)` gives account 1 / account 2.
3. The wallet UI imports the token contract address (if the product supports custom tokens); the integration test can directly assert `balanceOf`.

Deployment and mint should be done in **Node test `beforeAll`** or **shell preset script**, independent of browser.

---

## 8. Recommended layering

| Hierarchy      | Tools                | Content                                                                                                                                                     |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| On-chain logic | Vitest + ethers      | Fork provided by `anvil`; script funding, ERC20, A→B transfer, receipt                                                                                      |
| UI             | Playwright           | E2E completes login via WebAuthn/Passkey mock; do not inject `masterSeed` or `wallet_login_state`; RPC refers to local; assert balance and transaction list |
| CI             | GitHub Actions, etc. | Install Foundry → Start `anvil` → Wait for the port to be ready → Run the test                                                                              |

PR can only run **1~2 forks** (such as Sepolia + an L2 testnet); then expand the matrix nightly.

---

## 9. Risks and Constraints

- **Alchemy quota and rate limit**: Pay attention to the quota when multiple workers frequently fork; forks with the same block height (`--fork-block-number`) can be cached to reduce drift and repeated pulls.
- **Non-deterministic**: The fork heights are different and the status may be different; key assertions should be controlled by "self-deployment contract + mint" as much as possible.
- **4337/Bundler**: If you test smart accounts, you need to have a local bundler or align with the official test stack after forking, which is more complex than pure EOA.

---

## 10. Connection with this warehouse code

- **Implemented**: [`test/evmchain/README.md`](../../test/evmchain/README.md) in the warehouse - Vitest independent configuration, `yarn test:chain:*` step-by-step command, Sepolia example; change the templates in `test/evmchain/chains/` and `test/evmchain/cli/run.mjs` when extending a new chain.
- `src/config/chains.ts`: You can add `VITE_E2E_RPC_*` or test mode later to point the RPC of a certain `chainId` to `127.0.0.1` (separate PR).
- This document is **Proposal and Agreement**; on-chain scripts and ERC20 deployment can be placed in `scripts/testchain/`; browser E2E uses `e2e/` (Playwright).

See [`anvil-fork-runbook.md`](./anvil-fork-runbook.md) for more command snippets.
