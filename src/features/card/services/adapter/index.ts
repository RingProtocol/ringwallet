import { cardProviderRegistry } from '../registry'
import { immersveAdapter } from './ImmersveAdapter'

cardProviderRegistry.register(immersveAdapter)

export type { CardProviderAdapter, CardType } from './types'
export {
  MemoryBackedCardAdapter,
} from './memoryBackedCardAdapter'
export type { MemoryBackedCardAdapterSpec } from './memoryBackedCardAdapter'
export { immersveAdapter } from './ImmersveAdapter'
