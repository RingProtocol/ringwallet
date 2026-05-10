import { cardProviderRegistry } from '../registry'
import { mockAdapter } from './MockAdapter'

// Register mock adapter for development
cardProviderRegistry.register(mockAdapter)

export type { CardProviderAdapter, CardType } from './types'
export { mockAdapter } from './MockAdapter'
export { immersveAdapter } from './ImmersveAdapter'
