import type { ChainTestProfile } from './types'
import { sepoliaProfile } from './sepolia'
import { hyperliquidProfile } from './hyperliquid'
import { optimismProfile, opSepoliaProfile } from './optimism'
import { arbitrumProfile, arbitrumSepoliaProfile } from './arbitrum'
import { polygonProfile, polygonAmoyProfile } from './polygon'
import { avalancheProfile, fujiProfile } from './avalanche'
import { xlayerProfile, xlayerTestnetProfile } from './xlayer'
import { plasmaProfile, plasmaTestnetProfile } from './plasma'
import { baseProfile, baseSepoliaProfile } from './base'
import { zksyncProfile, zksyncSepoliaProfile } from './zksync'
import { lineaProfile, lineaSepoliaProfile } from './linea'
import { scrollProfile, scrollSepoliaProfile } from './scroll'
import { bnbProfile, bnbTestnetProfile } from './bnb'
import { celoProfile, celoAlfajoresProfile } from './celo'
import { gnosisProfile, gnosisChiadoProfile } from './gnosis'
import { mantleProfile, mantleSepoliaProfile } from './mantle'
import { blastProfile, blastSepoliaProfile } from './blast'
import { zoraProfile, zoraSepoliaProfile } from './zora'
import { fantomProfile, fantomTestnetProfile } from './fantom'
import { moonbeamProfile, moonbaseAlphaProfile } from './moonbeam'
import {
  polygonZkevmProfile,
  polygonZkevmCardonaProfile,
} from './polygon-zkevm'
import { megaethTestnetProfile } from './megaeth'

const registry: Record<string, ChainTestProfile> = {
  sepolia: sepoliaProfile,
  hyperliquid: hyperliquidProfile,
  optimism: optimismProfile,
  'op-sepolia': opSepoliaProfile,
  arbitrum: arbitrumProfile,
  'arbitrum-sepolia': arbitrumSepoliaProfile,
  polygon: polygonProfile,
  'polygon-amoy': polygonAmoyProfile,
  avalanche: avalancheProfile,
  fuji: fujiProfile,
  xlayer: xlayerProfile,
  'xlayer-testnet': xlayerTestnetProfile,
  plasma: plasmaProfile,
  'plasma-testnet': plasmaTestnetProfile,
  base: baseProfile,
  'base-sepolia': baseSepoliaProfile,
  zksync: zksyncProfile,
  'zksync-sepolia': zksyncSepoliaProfile,
  linea: lineaProfile,
  'linea-sepolia': lineaSepoliaProfile,
  scroll: scrollProfile,
  'scroll-sepolia': scrollSepoliaProfile,
  bnb: bnbProfile,
  'bnb-testnet': bnbTestnetProfile,
  celo: celoProfile,
  'celo-alfajores': celoAlfajoresProfile,
  gnosis: gnosisProfile,
  'gnosis-chiado': gnosisChiadoProfile,
  mantle: mantleProfile,
  'mantle-sepolia': mantleSepoliaProfile,
  blast: blastProfile,
  'blast-sepolia': blastSepoliaProfile,
  zora: zoraProfile,
  'zora-sepolia': zoraSepoliaProfile,
  fantom: fantomProfile,
  'fantom-testnet': fantomTestnetProfile,
  moonbeam: moonbeamProfile,
  'moonbase-alpha': moonbaseAlphaProfile,
  'polygon-zkevm': polygonZkevmProfile,
  'polygon-zkevm-cardona': polygonZkevmCardonaProfile,
  'megaeth-testnet': megaethTestnetProfile,
}

export function getChainProfile(chainId: string): ChainTestProfile {
  const p = registry[chainId]
  if (!p) {
    throw new Error(
      `Unknown test chain "${chainId}". Known: ${listChainIds().join(', ')}`
    )
  }
  return p
}

export function listChainIds(): string[] {
  return Object.keys(registry)
}

export {
  sepoliaProfile,
  hyperliquidProfile,
  optimismProfile,
  opSepoliaProfile,
  arbitrumProfile,
  arbitrumSepoliaProfile,
  polygonProfile,
  polygonAmoyProfile,
  avalancheProfile,
  fujiProfile,
  xlayerProfile,
  xlayerTestnetProfile,
  plasmaProfile,
  plasmaTestnetProfile,
  baseProfile,
  baseSepoliaProfile,
  zksyncProfile,
  zksyncSepoliaProfile,
  lineaProfile,
  lineaSepoliaProfile,
  scrollProfile,
  scrollSepoliaProfile,
  bnbProfile,
  bnbTestnetProfile,
  celoProfile,
  celoAlfajoresProfile,
  gnosisProfile,
  gnosisChiadoProfile,
  mantleProfile,
  mantleSepoliaProfile,
  blastProfile,
  blastSepoliaProfile,
  zoraProfile,
  zoraSepoliaProfile,
  fantomProfile,
  fantomTestnetProfile,
  moonbeamProfile,
  moonbaseAlphaProfile,
  polygonZkevmProfile,
  polygonZkevmCardonaProfile,
  megaethTestnetProfile,
}
