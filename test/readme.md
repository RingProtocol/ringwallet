# Ring Wallet — Test Architecture

## 目录结构

```
test/
├── unit/         # 单元测试 + 真实 RPC 连通性测试
├── simulation/   # 本地节点模拟测试（anvil / regtest / localnet）
└── playwright/   # E2E 浏览器自动化测试
```

## 快速命令

| 命令                                   | 说明                                  |
| -------------------------------------- | ------------------------------------- |
| `yarn test`                            | 单元测试 + RPC 连通性（无需本地节点） |
| `yarn test:chain`                      | EVM Anvil fork 测试                   |
| `yarn test:multichain:solana-local`    | Solana 本地节点测试                   |
| `yarn test:multichain:bitcoin-regtest` | Bitcoin regtest 测试                  |
| `yarn test:e2e`                        | Playwright E2E 测试                   |

## 三层测试分层

| 层       | 目录               | 网络依赖               | Vitest 配置                            |
| -------- | ------------------ | ---------------------- | -------------------------------------- |
| **单元** | `test/unit/`       | 无（RPC 连通测试可选） | `vitest.config.ts`                     |
| **模拟** | `test/simulation/` | 本地节点               | `vitest.simulation.config.ts`          |
| **E2E**  | `test/playwright/` | 本地节点 + 浏览器      | `test/playwright/playwright.config.ts` |

## 共享工具

- `test/lib/env.ts` — 加载 `.env.test` 并提供 Alchemy key 工具函数

## 添加测试

| 测试类型           | 目录                             | 命名        |
| ------------------ | -------------------------------- | ----------- |
| 纯逻辑 / mock 依赖 | `test/unit/`（镜像 `src/` 路径） | `*.test.ts` |
| 真实 RPC 连通检测  | `test/unit/rpc/`                 | `*.spec.ts` |
| 本地链集成测试     | `test/simulation/<chain>/`       | `*.spec.ts` |
| E2E 浏览器测试     | `test/playwright/tests/`         | `*.spec.ts` |

## CI

`yarn test` 无外部依赖，默认接入 CI。
模拟测试和 E2E 需本地节点就绪后按需接入。
