# Anvil Fork 运行手册（简版）

## 前置

- 安装 [Foundry](https://book.getfoundry.sh/getting-started/installation)（含 `anvil`）。
- `.env.test` 中配置 `ALCHEMY_API_KEY`，或仅配置 **`TESTCHAIN_FORK_URL_SEPOLIA`**（见 `test/evmchain/README.md` 的 403 / origin 说明 — Alchemy 常把浏览器 key 限制来源，Anvil 会 403）。

## Alchemy 403（origin not on whitelist）

优先在 **Alchemy 控制台** 为该 key 放行服务端/CLI（或放宽来源限制）。  
若暂时不用 Alchemy 做 fork：从 `.env.test` **去掉** `ALCHEMY_API_KEY` / `VITE_ALCHEMY_RPC_KEY`，仅保留 `TESTCHAIN_FORK_URL_SEPOLIA=https://rpc.sepolia.org`，再 `yarn test:chain:fork-url`（无 key 时才会用该 URL）。

## 启动单链分叉

```bash
set -a && source .env.test && set +a
anvil --fork-url "https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}" --port 8545
```

固定分叉块（可复现、减负载）：

```bash
anvil --fork-url "https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}" \
  --fork-block-number 8000000 \
  --port 8545
```

## 验证

```bash
cast chain-id --rpc-url http://127.0.0.1:8545
# 期望与 Sepolia 一致：11155111
```

## 用默认账户给某地址转 native

将 `TO` 换成钱包推导出的测试地址，`KEY` 为 Anvil 打印的第一账户私钥：

```bash
cast send --rpc-url http://127.0.0.1:8545 \
  --private-key "$ANVIL_DEFAULT_PK" \
  --value 1ether \
  "$TO"
```

## ERC20 最小流程（概念）

1. `forge create` 或脚本部署 `TestToken`（带 `mint`）。
2. `cast send` 调用 `mint(0xYourAddr, 1000000000000000000000)`。
3. 钱包添加 token 合约地址后查 `balanceOf`。

具体 Solidity / 脚本可放在 `scripts/testchain/`（待实现）。

## 停止

前台 `Ctrl+C`；后台 `pkill anvil` 或记录 pid 后 `kill`。
