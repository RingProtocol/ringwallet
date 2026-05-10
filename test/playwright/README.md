# playwright — E2E 浏览器测试

使用 Playwright 在真实浏览器中测试完整的钱包流程，依赖本地 Anvil 节点。

## 前提条件

- [Foundry](https://getfoundry.sh) — `anvil` 在 PATH 中
- `.env.test` 中配置 `ALCHEMY_API_KEY`（用于 fork Sepolia）

## 运行

```bash
# 终端 A：启动 Anvil 节点（Sepolia 8545 + Hyperliquid 8546）
yarn test:e2e:anvil

# 终端 B：运行 E2E 测试
yarn test:e2e

# 或使用 Playwright UI 模式（交互式调试）
yarn test:e2e:ui
```

## 说明

- `playwright.config.ts` — Playwright 配置（浏览器、超时、baseURL 等）
- `env.ts` — 测试链配置（chainId、端口、RPC URL）
- `fixtures/` — 共享 fixture（wallet、mock 数据）
- `helpers/` — WebAuthn 模拟、路由代理等工具函数
- `tests/` — 测试文件（EVM 转账、Solana smoke、账户余额等）
- `scripts/start-anvil.mjs` — 启动指定 chainId + 端口的 Anvil 实例
