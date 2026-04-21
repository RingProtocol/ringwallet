# simulation/solana — Solana 本地节点测试

使用 `solana-test-validator` 本地节点进行完整的 SOL 转账测试。

## 前提条件

- Solana CLI 已安装（`solana-test-validator` 在 PATH 中）

## 运行

```bash
# 终端 A：启动本地 Solana 节点
solana-test-validator --reset

# 终端 B：等待节点就绪后运行测试
SOLANA_LOCAL_TEST=1 yarn test:multichain:solana-local
```

或使用一键命令（内部会等待节点就绪）：

```bash
solana-test-validator --reset &
yarn test:multichain:solana-local
```

## 说明

- `wait-rpc.mjs` — 轮询 `http://127.0.0.1:8899` 直到节点就绪
- `solana.local.integration.spec.ts` — 测试 SOL 转账全流程：airdrop → 派生 → 签名 → 广播
