# unit/rpc — 真实 RPC 连通性测试

验证各链公共 RPC 节点是否可达，以及 chain plugin 的地址派生是否正确。

**不依赖本地节点**，可选配置 Alchemy API Key 以使用更稳定的端点。

## 运行

```bash
yarn test                          # 随单元测试一起运行（默认）
SKIP_MULTICHAIN_INTEGRATION=1 yarn test  # 跳过 RPC 连通测试
```

## 环境变量

`.env.test` 中配置一个 `ALCHEMY_API_KEY`（或 `VITE_ALCHEMY_RPC_KEY`）即可覆盖所有链，
也可按链单独指定：

| 变量                       | 默认值                                         |
| -------------------------- | ---------------------------------------------- |
| `TEST_EVM_RPC_URL`         | `https://eth.llamarpc.com`                     |
| `TEST_SOLANA_RPC_URL`      | Alchemy devnet / `api.mainnet-beta.solana.com` |
| `TEST_BITCOIN_INDEXER_URL` | Alchemy testnet / Blockstream Esplora          |
| `TEST_COSMOS_RPC_URL`      | `https://cosmos-rest.publicnode.com`           |
| `TEST_TRON_API_URL`        | Alchemy mainnet / TronGrid Shasta              |

## 文件说明

| 文件                    | 说明                                      |
| ----------------------- | ----------------------------------------- |
| `seed.ts`               | 测试用确定性 32 字节主密钥                |
| `lib/resolveTestRpc.ts` | 各链 RPC URL 解析逻辑                     |
| `evm.rpc.spec.ts`       | EVM 公共 RPC + EvmChainPlugin 派生        |
| `bitcoin.rpc.spec.ts`   | Bitcoin Esplora 高度 + BitcoinChainPlugin |
| `solana.rpc.spec.ts`    | Solana blockhash + SolanaChainPlugin      |
| `cosmos.rpc.spec.ts`    | Cosmos REST + CosmosChainPlugin           |
| `tron.rpc.spec.ts`      | Tron getnowblock + TronChainPlugin        |
| `balance.spec.ts`       | 多链余额查询（需配置测试地址）            |
