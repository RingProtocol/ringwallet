import type { ChainTestProfile } from './types'
import { resolveSepoliaForkRpcUrl } from '../lib/resolveForkUrl'

export const sepoliaProfile: ChainTestProfile = {
  id: 'sepolia',
  displayName: 'Sepolia',
  chainId: 11155111,
  defaultAnvilPort: 8545,
  buildForkRpcUrl() {
    return resolveSepoliaForkRpcUrl()
  },
}
