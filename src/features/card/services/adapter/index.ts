import { cardProviderRegistry } from '../registry'
import { etherfiAdapter } from './EtherfiAdapter'
import { immersveAdapter } from './ImmersveAdapter'

cardProviderRegistry.register(immersveAdapter)
cardProviderRegistry.register(etherfiAdapter)

export type { CardProviderAdapter, CardType } from './types'
export {
  MemoryBackedCardAdapter,
} from './memoryBackedCardAdapter'
export type { MemoryBackedCardAdapterSpec } from './memoryBackedCardAdapter'
export { etherfiAdapter } from './EtherfiAdapter'
export { immersveAdapter } from './ImmersveAdapter'
