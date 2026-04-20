#!/usr/bin/env sh
# Run bitcoin-cli against the regtest container (host or CI).
exec docker exec ring-bitcoind-regtest bitcoin-cli -regtest -rpcuser=ci -rpcpassword=cipass "$@"
