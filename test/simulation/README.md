# simulation — 本地节点模拟测试

所有测试均依赖本地运行的区块链节点，不打公网。

## 子目录与运行命令

| 目录               | 节点                       | 运行命令                               | 测试内容                         |
| ------------------ | -------------------------- | -------------------------------------- | -------------------------------- |
| `evm/` Sepolia     | Anvil (Sepolia fork)       | `yarn test:chain:sepolia`              | 余额查询、原生转账、receipt 确认 |
| `evm/` Hyperliquid | Anvil (本地链 chainId=998) | `yarn test:chain:hyperliquid`          | 余额查询、原生转账、receipt 确认 |
| `bitcoin/`         | Bitcoin regtest (Docker)   | `yarn test:multichain:bitcoin-regtest` | UTXO 构建、广播、余额变化        |
| `solana/`          | solana-test-validator      | `yarn test:multichain:solana-local`    | SOL 转账、余额查询               |

## 一键准备所有本地节点

```bash
yarn test:prepare
```

启动：Sepolia Anvil (8545) + Hyperliquid Anvil (8546) + Bitcoin regtest Docker + Solana validator。
需要：Docker、Foundry (`anvil`)、Solana CLI。缺少工具时对应节点自动跳过。

## 各链单独启动

```bash
# Sepolia fork（需要 ALCHEMY_API_KEY）
anvil --fork-url "$(yarn -s test:chain:fork-url)" --port 8545

# Hyperliquid 本地链（无需 API Key）
anvil --chain-id 998 --port 8546

# Bitcoin regtest
docker compose -f test/simulation/bitcoin/docker-compose.yml up -d

# Solana
solana-test-validator --reset
```

## 共享资源

- `seed.ts` — 各 simulation 测试共用的确定性 32 字节主密钥
