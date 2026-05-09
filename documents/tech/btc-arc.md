Architecture description
Alchemy (…g.alchemy.com/v2/…) is Bitcoin Core-style JSON-RPC, not Blockstream’s /address/…/utxo REST.
The UTXO list of any address must use Esplora/indexing service; pure node RPC cannot replace "check UTXO by address".
Therefore: When VITE_BITCOIN_API is configured as the Alchemy main network, it will still automatically bring the main network Esplora backup https://blockstream.info/api to do getUtxos/balance.
Rate: GET /fee-estimates (Esplora) takes priority; if it fails, adjust estimatesmartfee ​​for Alchemy and replace BTC/kB with sat/vB.
Broadcast: POST /tx (Esplora) takes priority; if it fails, sendrawtransaction is called on Alchemy.

mempool.space/testnet4/api/address/tb1qrqrten26d3npkcngmfhaulkr5sl0jk3s5qqyen/utxo
[{"txid":"556a6349cb70f1bbfb025590d03a48cfac6519b5224f7dd127dba67e1e8d8623","vout":1,"status":{"confirmed":true,"block_height":127468,"block_hash":"0000000000000002b66ba79aad2702e6e46f2e91851e8c62a0a68e165ff5d36f","block_time":1774583450},"value":5000}]
