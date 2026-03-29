架构说明
Alchemy（…g.alchemy.com/v2/…）是 Bitcoin Core 风格的 JSON-RPC，不是 Blockstream 那种 /address/.../utxo REST。
任意地址的 UTXO 列表 必须用 Esplora / 索引服务；纯节点 RPC 不能替代「按地址查 UTXO」。
因此：VITE_BITCOIN_API 配成 Alchemy 主网 时，仍然会自动带上 主网 Esplora 后备 https://blockstream.info/api 做 getUtxos / 余额。
费率：GET /fee-estimates（Esplora）优先；失败则对 Alchemy 调 estimatesmartfee，并把 BTC/kB 换成 sat/vB。
广播：POST /tx（Esplora）优先；失败则对 Alchemy 调 sendrawtransaction。

mempool.space/testnet4/api/address/tb1qrqrten26d3npkcngmfhaulkr5sl0jk3s5qqyen/utxo
[{"txid":"556a6349cb70f1bbfb025590d03a48cfac6519b5224f7dd127dba67e1e8d8623","vout":1,"status":{"confirmed":true,"block_height":127468,"block_hash":"0000000000000002b66ba79aad2702e6e46f2e91851e8c62a0a68e165ff5d36f","block_time":1774583450},"value":5000}]
