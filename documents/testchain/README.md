# 多链自动化测试方案（Testchain）

面向 Ring Wallet 的链上集成与 E2E：用 **Anvil 分叉真实网络** 覆盖多条链，避免只跑本地 `31337`；资金由 Anvil 默认账户或自部署 ERC20 `mint` 提供，不依赖浏览器 Faucet。

---

## 1. 目标

| 能力       | 做法                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| 多链       | 每条目标链对应一次 `anvil --fork-url <Alchemy RPC>`（可并行多端口）                  |
| 与生产一致 | 分叉后 `chainId`、预编译、常见合约与远程一致（仅状态快照于本地）                     |
| 资金       | Anvil 内置账户私钥转 native；ERC20 测试币自行部署 + `mint`                           |
| 钱包连接   | 测试构建下将目标链 **RPC 指向 `http://127.0.0.1:<port>`**（与分叉链 `chainId` 一致） |

---

## 2. 为何用 Fork，而不是只跑 31337

- **31337** 是纯本地空链：与「钱包已支持的各链」在 chainId、gas 行为、部分 opcode/预编译差异上不一致。
- **`anvil --fork-url`**：在本地执行交易，读状态来自 Alchemy（等）快照；**chainId 与分叉目标一致**，钱包侧仍选「Sepolia / Arbitrum / …」同一条逻辑链，仅 RPC 临时改为本地。

---

## 3. 环境变量（`.env.test`）

在 **Node 测试脚本 / CI** 中读取（不要提交真实 key；CI 用 secret 注入）：

| 变量                         | 用途                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `ALCHEMY_API_KEY`            | **优先**：有 key 时 `fork-url` 使用 Alchemy Sepolia（请在控制台放行 CLI/服务端，避免 anvil 403） |
| `VITE_ALCHEMY_RPC_KEY`       | 与上并列，任一存在则 **优先 Alchemy**                                                            |
| `TESTCHAIN_FORK_URL_SEPOLIA` | **仅当未配置上述 key** 时用作 `anvil --fork-url`（例如本地只用公共 RPC）                         |
| `TESTCHAIN_FORK_URL`         | 同上兜底                                                                                         |
| `ANVIL_PORT`                 | 可选，默认 `8545`；多链并行时用 `8545`、`8546`…                                                  |

`yarn test:chain:fork-url`：**有 Alchemy key → Alchemy**；否则用 `TESTCHAIN_FORK_URL_*`。

钱包 **E2E** 仍可用 `VITE_ALCHEMY_RPC_KEY`；**Anvil fork** 若遇 403，见 [`test/evmchain/README.md`](../../test/evmchain/README.md) Troubleshooting。

示例见同目录 [`env.test.example`](./env.test.example)。

---

## 4. Alchemy RPC 与 `--fork-url` 拼接

用 key 替换末尾占位符即可（与 `src/config/chains.ts` 中各链 Alchemy 形态对齐）：

| 分叉目标         | `FORK_URL` 模板                                               |
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

其他链若 Alchemy 支持，按官方文档换 host 即可。**不支持分叉的链**（或非 EVM）不强行用本方案，另列测试策略（mock / 测试网直连 / 链专属工具）。

启动示例：

```bash
export FORK_URL="https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
anvil --fork-url "$FORK_URL" --port 8545
```

多链并行：

```bash
anvil --fork-url "$FORK_URL_SEPOLIA" --port 8545 &
anvil --fork-url "$FORK_URL_ARBITRUM_SEPOLIA" --port 8546 &
```

---

## 5. 钱包如何「连上」Fork

1. 启动 Anvil（带 `--fork-url`）。
2. 在 **测试专用配置** 中：将对应 `chainId` 的 `rpcUrl` 首项设为 `http://127.0.0.1:<port>`（或通过 `globalSetup` / `page.addInitScript` 覆盖 `localStorage` / 运行时 chain 列表，视实现而定）。
3. 用户在 UI 中选择与分叉一致的链（如 Sepolia `11155111`），实际 RPC 指向本地。

注意：分叉节点上的交易**不会**写回 Alchemy；仅本地可见。

---

## 6. Anvil 默认账户与 Native 资金

- Anvil 预置 10 个账户，私钥在启动日志中打印（Foundry 文档亦有固定测试私钥列表）。
- 分叉链上的 **native 余额**来自快照：若测试地址在远程测试网上没钱，可在本地用任意 Anvil 账户私钥对**你的测试地址**做 `eth_sendTransaction` 转账；本地状态可写，余额在 fork 上有效（直至重启 anvil）。

---

## 7. ERC20：自部署与 Mint

适用于「需要稳定测试代币符号 / 无限额度」的场景：

1. 使用 **Foundry `forge script`** 或 **ethers.js** 在 fork 上部署极简 `ERC20`（OpenZeppelin `ERC20` + `mint`）。
2. `mint(testAddress, amount)` 给账号 1 / 账号 2。
3. 钱包 UI 导入该 token 合约地址（若产品支持自定义 token）；集成测试可直接 `balanceOf` 断言。

部署与 mint 应在 **Node 测试 `beforeAll`** 或 **shell 预置脚本** 中完成，不依赖浏览器。

---

## 8. 推荐分层

| 层级     | 工具              | 内容                                                                                                                   |
| -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 链上逻辑 | Vitest + ethers   | Fork 由 `anvil` 提供；脚本 funding、ERC20、A→B 转账、receipt                                                           |
| UI       | Playwright        | E2E 通过 WebAuthn/Passkey mock 完成登录；不要注入 `masterSeed` 或 `wallet_login_state`；RPC 指本地；断言余额与交易列表 |
| CI       | GitHub Actions 等 | 安装 Foundry → 起 `anvil` → 等端口就绪 → 跑测试                                                                        |

PR 可只跑 **1～2 条 fork**（如 Sepolia + 一条 L2 testnet）；nightly 再扩矩阵。

---

## 9. 风险与约束

- **Alchemy 额度与 rate limit**：多 worker 频繁 fork 时注意配额；可缓存同一区块高度的 fork（`--fork-block-number`）减轻漂移与重复拉取。
- **非确定性**：分叉高度不同，状态可能不同；关键断言尽量用「自部署合约 + mint」自控。
- **4337 / Bundler**：若测智能账户，fork 后还需本地 bundler 或与官方测试栈对齐，复杂度高于纯 EOA。

---

## 10. 与本仓库代码的衔接

- **已实现**：仓库内 [`test/evmchain/README.md`](../../test/evmchain/README.md) — Vitest 独立配置、`yarn test:chain:*` 分步命令、Sepolia 示例；扩展新链时改 `test/evmchain/chains/` 与 `test/evmchain/cli/run.mjs` 中的模板。
- `src/config/chains.ts`：后续可加 `VITE_E2E_RPC_*` 或 test 模式把某 `chainId` 的 RPC 指到 `127.0.0.1`（单独 PR）。
- 本文档为 **方案与约定**；链上脚本、ERC20 部署可再放到 `scripts/testchain/`；浏览器 E2E 用 `e2e/`（Playwright）。

更多命令片段见 [`anvil-fork-runbook.md`](./anvil-fork-runbook.md)。
