export type {
  ChainPlugin,
  DerivedAccount,
  SignRequest,
  SignResult,
} from './types'
export { ChainFamily } from './types'
export {
  chainRegistry,
  BITCOIN_TESTNET_ACCOUNTS_KEY,
  DOGECOIN_TESTNET_ACCOUNTS_KEY,
} from './registry'

import './evm/evmPlugin'
import './solana/solanaPlugin'
import './bitcoin/bitcoinPlugin'
import './tron/tronPlugin'
import './cosmos/cosmosPlugin'
import './dogecoin/dogecoinPlugin'
