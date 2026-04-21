# simulation/bitcoin — Bitcoin Regtest 测试

使用本地 Docker Bitcoin regtest 节点进行完整的 UTXO 交易测试。

## 前提条件

- Docker 运行中
- 容器名须为 `ring-bitcoind-regtest`（compose 文件中已定义）

## 运行

```bash
# 1. 启动 Bitcoin regtest 节点
docker compose -f test/simulation/bitcoin/docker-compose.yml up -d

# 2. 运行测试
RUN_BITCOIN_REGTEST=1 yarn test:multichain:bitcoin-regtest
```

可选：指定自定义 Esplora 代理地址（默认 `http://127.0.0.1:3002`）：

```bash
TEST_BITCOIN_INDEXER_URL=http://127.0.0.1:3002 RUN_BITCOIN_REGTEST=1 yarn test:multichain:bitcoin-regtest
```

## 说明

- `esplora-proxy.mjs` — 在 `beforeAll` 中自动启动，将 Esplora HTTP 接口代理到 `bitcoin-cli`
- `bitcoin-cli.sh` — 快捷调用容器内 bitcoin-cli 的脚本
- `docker-compose.yml` — bitcoind regtest 节点配置
