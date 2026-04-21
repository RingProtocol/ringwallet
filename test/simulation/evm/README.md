# simulation/evm — EVM 本地链测试

基于本地 Anvil 节点的端到端 EVM 测试：密钥派生 → 充值 → 签名 EIP-1559 → 广播 → receipt 确认。

## 测试覆盖

- chainId / 区块结构 / gas 价格查询
- 余额查询（`eth_getBalance`）
- 原生代币转账完整链路（`EvmChainPlugin` + `EvmWalletService` 两条路径）

## 支持的链

| 链                  | chainId  | 端口 | Anvil 模式             | 运行命令                      |
| ------------------- | -------- | ---- | ---------------------- | ----------------------------- |
| Sepolia             | 11155111 | 8545 | fork（需 Alchemy Key） | `yarn test:chain`             |
| Hyperliquid Testnet | 998      | 8546 | 本地新链（无需 Key）   | `yarn test:chain:hyperliquid` |

## 启动本地节点

```bash
# 一键启动所有链
yarn test:prepare

# Sepolia（手动）
yarn test:chain:fork-url sepolia   # 打印 fork URL
anvil --fork-url "<URL>" --port 8545

# Hyperliquid（手动，无需 fork）
anvil --chain-id 998 --port 8546
```

## CLI 工具

```bash
node test/simulation/evm/cli/run.mjs doctor
node test/simulation/evm/cli/run.mjs fork-url sepolia
node test/simulation/evm/cli/run.mjs fork-url hyperliquid   # 打印 anvil 启动命令
node test/simulation/evm/cli/run.mjs wait-anvil sepolia
node test/simulation/evm/cli/run.mjs wait-anvil hyperliquid
```

## 扩展新链

1. 在 `chains/` 中新建链文件，实现 `ChainTestProfile`（`buildForkRpcUrl` 返回 `null` 表示本地新链）。
2. 在 `chains/index.ts` 中注册。
3. 在 `cli/run.mjs` 的 `CHAINS` 表中同步添加。
4. 添加 `<chain>.fork.spec.ts`（fork 链）或 `<chain>.local.spec.ts`（本地新链）。

## 排错（Sepolia）

**HTTP 403 / origin not on whitelist**：Alchemy 浏览器 Key 限制来源。
在 Alchemy Dashboard 允许服务器端请求，或改用 `TESTCHAIN_FORK_URL_SEPOLIA=https://rpc.sepolia.org`。
