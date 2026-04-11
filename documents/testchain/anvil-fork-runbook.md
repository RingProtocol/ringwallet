# Anvil Fork Operation Manual (Simplified Version)

## Prefix

- Install [Foundry](https://book.getfoundry.sh/getting-started/installation) (contains `anvil`).
- Configure `ALCHEMY_API_KEY` in `.env.test`, or only configure **`TESTCHAIN_FORK_URL_SEPOLIA`** (see the 403/origin description of `test/evmchain/README.md` - Alchemy often limits browser key sources, Anvil will 403).

## Alchemy 403（origin not on whitelist）

Preferably release the server/CLI (or relax source restrictions) for this key in the **Alchemy Console**.
If you do not need to fork Alchemy temporarily: **Remove** `ALCHEMY_API_KEY` / `VITE_ALCHEMY_RPC_KEY` from `.env.test`, keep only `TESTCHAIN_FORK_URL_SEPOLIA=https://rpc.sepolia.org`, and then `yarn test:chain:fork-url` (this URL will be used when there is no key).

## Start single chain fork

```bash
set -a && source .env.test && set +a
anvil --fork-url "https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}" --port 8545
```

Fixed fork block (reproducible, load-reducing):

```bash
anvil --fork-url "https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}" \
  --fork-block-number 8000000 \
  --port 8545
```

## verify

```bash
cast chain-id --rpc-url http://127.0.0.1:8545
# Expect the same as Sepolia: 11155111
```

## Use the default account to transfer an address to native

Replace `TO` with the test address derived by the wallet, and `KEY` with the first account private key printed by Anvil:

```bash
cast send --rpc-url http://127.0.0.1:8545 \
  --private-key "$ANVIL_DEFAULT_PK" \
  --value 1ether \
  "$TO"
```

## ERC20 minimum process (concept)

1. `forge create` or script deploy `TestToken` (with `mint`).
2. `cast send` calls `mint(0xYourAddr, 1000000000000000000000)`.
3. Check `balanceOf` after adding the token contract address to the wallet.

Specific Solidity/scripts can be placed in `scripts/testchain/` (to be implemented).

## stop

Foreground `Ctrl+C`; background `pkill anvil` or record pid and then `kill`.
