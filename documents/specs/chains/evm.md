All chains have been added. Here's a summary:

| Chain                   | ChainId | Symbol | RPC                            | Explorer               | Note                                            |
| ----------------------- | ------- | ------ | ------------------------------ | ---------------------- | ----------------------------------------------- |
| **Avalanche C-Chain**   | 43114   | AVAX   | avax.network + publicnode      | snowscan.xyz           | Was in FEATURED but missing from DEFAULT_CHAINS |
| **Avalanche Fuji**      | 43113   | AVAX   | avax-test.network + publicnode | testnet.snowscan.xyz   | Testnet                                         |
| **X Layer**             | 196     | OKB    | xlayer.tech + okx.com          | oklink.com/xlayer      | OKX L2                                          |
| **X Layer Testnet**     | 195     | OKB    | xlayer testnet RPCs            | oklink.com/xlayer-test |                                                 |
| **Hyperliquid L1**      | 999     | HYPE   | rpc.hyperliquid.xyz            | hypurrscan.io          | HyperEVM                                        |
| **Hyperliquid Testnet** | 998     | HYPE   | hyperliquid-testnet.xyz        | (none)                 |                                                 |
| **Plasma**              | 9745    | XPL    | rpc.plasma.to                  | plasmascan.to          |                                                 |
| **Plasma Testnet**      | 9746    | XPL    | testnet-rpc.plasma.to          | testnet.plasmascan.to  |                                                 |
| **MegaETH Testnet**     | 6342    | ETH    | carrot.megaeth.com             | (none)                 | Mainnet has no public RPC yet                   |
| **Dogechain**           | 2000    | DOGE   | dogechain.dog + ankr           | explorer.dogechain.dog | EVM sidechain wrapping DOGE                     |
| **Dogechain Testnet**   | 568     | DOGE   | rpc-testnet.dogechain.dog      | (none)                 |                                                 |
| **Provenance**          | -       | HASH   | -                              | -                      | Already existed                                 |

All new chains are EVM-compatible, so they work out of the box with the existing EVM wallet derivation, balance fetching, and transaction signing. MegaETH Mainnet was skipped because the YAML shows `rpc: []` (no public RPC available yet).
