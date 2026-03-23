export type { ChainPlugin, DerivedAccount, SignRequest, SignResult } from './types'
export { ChainFamily } from './types'
export { chainRegistry } from './registry'

import './evm/evmPlugin'
import './solana/solanaPlugin'
import './bitcoin/bitcoinPlugin'
import './tron/tronPlugin'
import './cosmos/cosmosPlugin'
