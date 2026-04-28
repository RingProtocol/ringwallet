#!/usr/bin/env node
/**
 * Pre-commit guard: every chain listed in FEATURED_CHAIN_IDS or
 * FEATURED_TESTNET_IDS must have a corresponding entry in DEFAULT_CHAINS.
 *
 * Exit code 1 → mismatch found, block the commit.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chainsPath = path.join(__dirname, '..', 'src', 'config', 'chains.ts')
const src = fs.readFileSync(chainsPath, 'utf8')

function extractArray(name) {
  const re = new RegExp(
    `export const ${name}\\s*:\\s*\\(number\\s*\\|\\s*string\\)\\[\\]\\s*=\\s*\\[(.*?)\\]`,
    's'
  )
  const m = src.match(re)
  if (!m) throw new Error(`Cannot find ${name} in chains.ts`)
  return m[1]
    .split('\n')
    .map((l) => l.split('//')[0].trim().replace(/,$/, ''))
    .filter((l) => l.length > 0)
    .map((l) => {
      if (l.startsWith("'") && l.endsWith("'")) return l.slice(1, -1)
      const n = Number(l)
      if (Number.isNaN(n)) throw new Error(`Unparseable id in ${name}: ${l}`)
      return n
    })
}

function extractDefaultChainIds() {
  const ids = []
  const re = /id:\s*([^,\n]+),/g
  let m
  while ((m = re.exec(src)) !== null) {
    let val = m[1].trim()
    // Skip type declarations / helper function signatures
    if (/string\s*\|\s*number/.test(val)) continue
    if (/CHAIN_ICON|WALLET_CHAIN_ID/.test(val)) continue
    if (val.startsWith("'") && val.endsWith("'")) {
      ids.push(val.slice(1, -1))
    } else {
      const n = Number(val)
      if (!Number.isNaN(n)) ids.push(n)
    }
  }
  return ids
}

const featuredMain = extractArray('FEATURED_CHAIN_IDS')
const featuredTest = extractArray('FEATURED_TESTNET_IDS')
const defaultIds = extractDefaultChainIds()
const defaultSet = new Set(defaultIds)

const missing = []
for (const id of featuredMain) {
  if (!defaultSet.has(id)) missing.push({ id, group: 'FEATURED_CHAIN_IDS' })
}
for (const id of featuredTest) {
  if (!defaultSet.has(id)) missing.push({ id, group: 'FEATURED_TESTNET_IDS' })
}

if (missing.length > 0) {
  console.error('❌ chains.ts validation failed')
  console.error(
    '   The following featured chains are missing from DEFAULT_CHAINS:'
  )
  for (const { id, group } of missing) {
    console.error(`   - ${group}: ${JSON.stringify(id)}`)
  }
  console.error(
    '\n   Add each missing chain to DEFAULT_CHAINS so balanceManager can query it.'
  )
  process.exit(1)
}

console.log(
  `✅ chains.ts OK — ${featuredMain.length} mainnets + ${featuredTest.length} testnets present in DEFAULT_CHAINS`
)
process.exit(0)
