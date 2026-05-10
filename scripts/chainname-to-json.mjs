#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const CHAINNAME_MD = join(ROOT, 'scripts', 'chainname.md')
const CHAINDATA_MD = join(ROOT, 'src', 'config', 'chaindata.md')
const CHAINID_YAML = join(ROOT, 'scripts', 'chainid.yaml')
const CHAINID_JSON = join(ROOT, 'public', 'chainid.json')
const USER_OVERRIDES_JSON = join(
  ROOT,
  'scripts',
  'chainname-chainid-overrides.json'
)

const ALCHEMY_HOST_RE = /https:\/\/([a-zA-Z0-9-]+)\.g\.alchemy\.com/

/** Alchemy "Network Name" → ethereum-lists / custom yaml `name` */
const NETWORK_ALIASES = {
  'Frax Mainnet': 'Fraxtal',
  'Frax Hoodi': 'Fraxtal Hoodi Testnet',
  'Metis Mainnet': 'Metis Andromeda Mainnet',
  'Anime Mainnet': 'Animechain Mainnet',
  'Anime Sepolia': 'Animechain Testnet',
  'Avalanche Mainnet': 'Avalanche C-Chain',
  'Boba Mainnet': 'Boba Network',
  'Sei Mainnet': 'Sei Network',
  'Race Sepolia': 'RACE Testnet',
  'Hyperliquid Testnet': 'Hyperliquid EVM Testnet',
  'Tron Testnet': 'Tron Shasta',
  'ADI Mainnet': 'ADI Chain',
  'Degen Mainnet': 'Degen Chain',
  'Race Mainnet': 'RACE Mainnet',
  'Abstract Testnet': 'Abstract Sepolia Testnet',
}

/** Slugs where automatic resolution is wrong or missing; extend via chainname-chainid-overrides.json */
const BUILTIN_SLUG_OVERRIDES = {
  'scroll-mainnet': 534352,
  'zksync-mainnet': 324,
  'polygon-amoy': 80002,
  'xprotocol-mainnet': 8386,
  'galactica-mainnet': 613419,
  'galactica-cassiopeia': 843843,
  'apechain-curtis': 33111,
  'race-mainnet': 6805,
  'starknet-sepolia': 920637907288165,
  'solana-devnet': 888888812,
  'aptos-testnet': 888888911,
  'xmtp-ropsten': 3,
  'bitcoin-testnet': 888888813,
  'bitcoin-signet': 888888814,
  'commons-mainnet': 888888815,
  'mythos-mainnet': 888888816,
  'earnm-sepolia': 888888817,
  'earnm-mainnet': 888888818,
  'worldl3-devnet': 888888819,
  'clankermon-mainnet': 888888820,
  'risa-testnet': 888888821,
  'tempo-mainnet': 888888822,
  'celestiabridge-mainnet': 888888823,
  'celestiabridge-mocha': 888888824,
  'alchemyarb-fam': 888888825,
  'alchemyarb-sepolia': 888888826,
  'syndicate-manchego': 888888827,
  'openloot-sepolia': 888888828,
  'worldmobile-devnet': 888888829,
  'degen-sepolia': 888888830,
  'alchemy-sepolia': 888888831,
  'alchemy-internal': 888888832,
  'adi-testnet': 888888833,
}

const BEACON_SLUGS = new Set([
  'eth-mainnetbeacon',
  'eth-sepoliabeacon',
  'eth-holeskybeacon',
  'eth-hoodibeacon',
])

const BEACON_BASE_CHAIN_ID = {
  'eth-mainnet': 1,
  'eth-sepolia': 11155111,
  'eth-holesky': 17000,
  'eth-hoodi': 560048,
}

function norm(s) {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/Holešky/gi, 'Holesky')
    .trim()
}

function fixNetworkName(net) {
  let n = norm(net)
  n = n.replace(/^OP Mainnet Mainnet$/i, 'OP Mainnet')
  n = n.replace(/^OP Mainnet Sepolia$/i, 'OP Sepolia Testnet')
  n = n.replace(/\s+Beacon$/i, '')
  return n
}

function networkVariants(net) {
  const n = fixNetworkName(NETWORK_ALIASES[net] ?? net)
  const v = new Set([n])
  const add = (x) => {
    if (x) v.add(x)
  }
  add(`${n} Testnet`)
  add(n.replace(/\s+Sepolia$/i, ' Sepolia Testnet'))
  add(n.replace(/\s+Mainnet$/i, ''))
  if (!/\bSepolia\b/i.test(n)) add(n.replace(/\s+Sepolia$/i, ''))
  add(n.replace(/\s+Testnet$/i, ''))
  add(n.replace(/\s+Devnet$/i, ''))
  add(n.replace(/^Ethereum\s+/i, ''))
  return [...v].sort((a, b) => b.length - a.length)
}

function buildYamlSlugMap(chains) {
  const m = new Map()
  for (const c of chains) {
    if (!c || typeof c.chainId !== 'number') continue
    if (
      typeof c.shortName === 'string' &&
      /^[a-zA-Z0-9-]+$/.test(c.shortName)
    ) {
      const k = c.shortName.toLowerCase()
      if (!m.has(k)) m.set(k, c.chainId)
    }
    let rpcs = c.rpc
    if (typeof rpcs === 'string') rpcs = [rpcs]
    if (!Array.isArray(rpcs)) continue
    for (const u of rpcs) {
      const mm = typeof u === 'string' && u.match(ALCHEMY_HOST_RE)
      if (mm && !m.has(mm[1])) m.set(mm[1], c.chainId)
    }
  }
  return m
}

function collectAlchemySlugsFromRpc(rpcs) {
  if (typeof rpcs === 'string') rpcs = [rpcs]
  if (!Array.isArray(rpcs)) return []
  const out = []
  for (const u of rpcs) {
    const mm = typeof u === 'string' && u.match(ALCHEMY_HOST_RE)
    if (mm) out.push(mm[1])
  }
  return out
}

function buildJsonAlchemyMap(chains) {
  const m = new Map()
  for (const c of chains) {
    for (const slug of collectAlchemySlugsFromRpc(c.rpc)) {
      if (!m.has(slug)) m.set(slug, c.chainId)
    }
  }
  return m
}

function firstMapByName(chains) {
  const m = new Map()
  for (const c of chains) {
    if (
      typeof c?.name === 'string' &&
      typeof c.chainId === 'number' &&
      !m.has(c.name)
    ) {
      m.set(c.name, c.chainId)
    }
  }
  return m
}

function lookupName(map, net) {
  for (const cand of networkVariants(net)) {
    const id = map.get(cand)
    if (id != null) return id
  }
  return undefined
}

function lookupNameLinear(chains, net) {
  for (const cand of networkVariants(net)) {
    const want = norm(cand).toLowerCase()
    for (const c of chains) {
      if (typeof c?.name !== 'string' || typeof c.chainId !== 'number') continue
      if (norm(c.name).toLowerCase() === want) return c.chainId
    }
  }
  return undefined
}

function stripSlugSuffixCandidates(slug) {
  const s = slug.toLowerCase()
  const out = [s]
  const suf =
    /-(mainnet|sepolia|testnet|devnet|mocha|fam|moderato|cassiopeia|curtis|signet|internal|ropsten|septestnet)$/i
  let cur = s
  for (let i = 0; i < 4 && suf.test(cur); i++) {
    cur = cur.replace(suf, '')
    out.push(cur)
  }
  return out
}

function resolveBeacon(slug, jsonAlchemy) {
  if (!BEACON_SLUGS.has(slug)) return undefined
  const base = slug.replace(/beacon$/i, '')
  if (jsonAlchemy.has(base)) return jsonAlchemy.get(base)
  return BEACON_BASE_CHAIN_ID[base]
}

function main() {
  const yamlChains = parseYaml(readFileSync(CHAINID_YAML, 'utf8'))
  const jsonChains = JSON.parse(readFileSync(CHAINID_JSON, 'utf8'))

  const yamlSlugMap = buildYamlSlugMap(yamlChains)
  const jsonAlchemyMap = buildJsonAlchemyMap(jsonChains)
  const yamlNameMap = firstMapByName(yamlChains)
  const jsonNameMap = firstMapByName(jsonChains)

  const userOverrides = existsSync(USER_OVERRIDES_JSON)
    ? JSON.parse(readFileSync(USER_OVERRIDES_JSON, 'utf8'))
    : {}
  const slugOverrides = { ...BUILTIN_SLUG_OVERRIDES, ...userOverrides }

  const chaindataLines = readFileSync(CHAINDATA_MD, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('//'))

  const slugToNetwork = new Map()
  for (const line of chaindataLines) {
    const mh = line.match(ALCHEMY_HOST_RE)
    if (!mh) continue
    const parts = line.split('\t')
    slugToNetwork.set(mh[1], (parts[1] ?? '').trim())
  }

  const slugs = readFileSync(CHAINNAME_MD, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const out = []
  const missing = []

  for (const slug of slugs) {
    const net = slugToNetwork.get(slug)
    if (net == null) {
      missing.push({ slug, reason: 'not in chaindata.md' })
      continue
    }

    let chainId = slugOverrides[slug]

    if (chainId == null) {
      chainId = yamlSlugMap.get(slug.toLowerCase())
    }

    if (chainId == null) {
      chainId = lookupName(yamlNameMap, net)
    }

    if (chainId == null) {
      chainId = lookupNameLinear(yamlChains, net)
    }

    if (chainId == null) {
      chainId = jsonAlchemyMap.get(slug)
    }

    if (chainId == null) {
      chainId = resolveBeacon(slug, jsonAlchemyMap)
    }

    if (chainId == null) {
      chainId = lookupName(jsonNameMap, net)
    }

    if (chainId == null) {
      chainId = lookupNameLinear(jsonChains, net)
    }

    if (chainId == null) {
      for (const cand of stripSlugSuffixCandidates(slug)) {
        if (yamlSlugMap.has(cand)) {
          chainId = yamlSlugMap.get(cand)
          break
        }
      }
    }

    if (chainId == null) {
      const last = net.split(/\s+/).pop()
      if (last && last.length > 2) {
        const t = norm(last).toLowerCase()
        const hits = jsonChains.filter(
          (c) => typeof c?.name === 'string' && norm(c.name).toLowerCase() === t
        )
        if (hits.length === 1) chainId = hits[0].chainId
      }
    }

    if (chainId == null) {
      missing.push({ slug, net })
    } else {
      out.push({ chainId, name: slug })
    }
  }

  if (missing.length) {
    console.error(
      'chainname-to-json: unresolved slugs (add to scripts/chainname-chainid-overrides.json):'
    )
    for (const m of missing) console.error(JSON.stringify(m))
    process.exit(1)
  }

  const json = JSON.stringify(out)
  process.stdout.write(`${json}\n`)
}

main()
