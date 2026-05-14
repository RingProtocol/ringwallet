/**
 * Chain-specific recommended bridge URLs.
 * Sourced from UNIVERSE_CHAIN_INFO in the Ring interface monorepo.
 */
export const CHAIN_BRIDGE_URLS: Record<number, string> = {
  10: 'https://app.optimism.io/bridge',
  42161: 'https://bridge.arbitrum.io/',
  137: 'https://portal.polygon.technology/bridge',
  8453: 'https://bridge.base.org/deposit',
  324: 'https://portal.zksync.io/bridge/',
  56: 'https://cbridge.celer.network/1/56',
  43114: 'https://core.app/bridge/',
  42220: 'https://www.portalbridge.com/#/transfer',
  81457: 'https://blast.io/bridge',
  7777777: 'https://bridge.zora.energy/',
  999: 'https://www.hyperbridge.xyz/',
  4326: 'https://rabbithole.megaeth.com/bridge',
}

export const LIFI_BRIDGE_URL = 'ringwallet://bridge/lifi'

/**
 * General bridging dapp URLs.
 * Sourced from BRIDGING_DAPP_URLS in the Ring interface monorepo.
 */
export const GENERAL_BRIDGE_URLS = [
  LIFI_BRIDGE_URL,
  'https://app.across.to',
  'https://www.bungee.exchange',
  'https://jumper.exchange',
  'https://app.rango.exchange',
  'https://app.debridge.finance',
  'https://superbridge.app',
  'https://www.brid.gg',
  'https://stargate.finance',
  'https://www.cctp.io',
  'https://www.orbiter.finance',
  'https://synapseprotocol.com',
  'https://portal.polygon.technology',
  'https://bridge.arbitrum.io',
  'https://portal.zksync.io',
  'https://app.hop.exchange',
  'https://www.zkbridge.com',
  'https://core.allbridge.io',
  'https://app.crosscurve.fi',
  'https://app.squidrouter.com',
  'https://app.rhino.fi',
  'https://app.routernitro.com',
  'https://bridge.connext.network',
  'https://satellite.money',
  'https://owlto.finance',
  'https://app.xy.finance',
  'https://cbridge.celer.network',
  'https://portalbridge.com',
]

function extractHostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function titleCase(name: string): string {
  return name
    .split(/[-_.\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Derive a human-readable name from a bridge URL.
 */
export function getBridgeNameFromUrl(url: string): string {
  const host = extractHostName(url)
  if (url === LIFI_BRIDGE_URL) return 'LI.FI'
  const knownNames: Record<string, string> = {
    'app.across.to': 'Across',
    'www.bungee.exchange': 'Bungee',
    'jumper.exchange': 'Jumper',
    'app.rango.exchange': 'Rango',
    'app.debridge.finance': 'DeBridge',
    'superbridge.app': 'Superbridge',
    'www.brid.gg': 'Brid.gg',
    'stargate.finance': 'Stargate',
    'www.cctp.io': 'CCTP',
    'www.orbiter.finance': 'Orbiter',
    'synapseprotocol.com': 'Synapse',
    'portal.polygon.technology': 'Polygon Portal',
    'bridge.arbitrum.io': 'Arbitrum Bridge',
    'portal.zksync.io': 'zkSync Portal',
    'app.hop.exchange': 'Hop',
    'www.zkbridge.com': 'zkBridge',
    'core.allbridge.io': 'Allbridge',
    'app.crosscurve.fi': 'CrossCurve',
    'app.squidrouter.com': 'Squid',
    'app.rhino.fi': 'Rhino',
    'app.routernitro.com': 'Router Nitro',
    'bridge.connext.network': 'Connext',
    'satellite.money': 'Satellite',
    'owlto.finance': 'Owlto',
    'app.xy.finance': 'XY Finance',
    'cbridge.celer.network': 'Celer cBridge',
    'portalbridge.com': 'Portal Bridge',
    'app.optimism.io': 'Optimism Bridge',
    'bridge.base.org': 'Base Bridge',
    'core.app': 'Core Bridge',
    'blast.io': 'Blast Bridge',
    'bridge.zora.energy': 'Zora Bridge',
    'www.hyperbridge.xyz': 'Hyperbridge',
    'rabbithole.megaeth.com': 'MegaETH Bridge',
  }

  return knownNames[host] || titleCase(host.split('.')[0])
}

/**
 * Build the ordered list of bridge URLs for a given chain.
 * The chain's canonical bridge (if any) is placed first as the recommendation.
 */
export function getBridgeUrlsForChain(chainId: number | string): string[] {
  const numericId =
    typeof chainId === 'string' ? parseInt(chainId, 10) : chainId
  if (isNaN(numericId)) return [...GENERAL_BRIDGE_URLS]

  const canonical = CHAIN_BRIDGE_URLS[numericId]
  const general = GENERAL_BRIDGE_URLS.filter((url) => url !== canonical)

  if (canonical) {
    return [canonical, ...general]
  }
  return general
}
