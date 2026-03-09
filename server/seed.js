/**
 * Database seed script.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node seed.js
 *
 * Or if .env is configured:
 *   node --env-file=.env seed.js
 */

import { initDB, getSQL, upsertCategory, createDApp, getDApps } from './db.js'

const SEED_CATEGORIES = [
  { id: 'defi',   name: 'DeFi',    icon: '', sort_order: 1 },
  { id: 'nft',    name: 'NFT',     icon: '', sort_order: 2 },
  { id: 'game',   name: 'Games',   icon: '', sort_order: 3 },
  { id: 'social', name: 'Social',  icon: '', sort_order: 4 },
  { id: 'tool',   name: 'Tools',   icon: '', sort_order: 5 },
  { id: 'bridge', name: 'Bridge',  icon: '', sort_order: 6 },
]

const SEED_DAPPS = [
  {
    id: 'uniswap',
    name: 'Uniswap',
    description: 'Decentralized token exchange',
    url: 'https://app.uniswap.org',
    icon: 'https://app.uniswap.org/favicon.ico',
    chains: [1, 10, 137, 42161, 8453],
    category: 'defi',
    featured: true,
    inject_mode: 'proxy',
    status: 'active',
    sort_order: 1,
  },
  {
    id: 'aave',
    name: 'Aave',
    description: 'Decentralized lending protocol',
    url: 'https://app.aave.com',
    icon: 'https://app.aave.com/favicon.ico',
    chains: [1, 10, 137, 42161],
    category: 'defi',
    featured: true,
    inject_mode: 'proxy',
    status: 'active',
    sort_order: 2,
  },
  {
    id: 'opensea',
    name: 'OpenSea',
    description: 'NFT marketplace',
    url: 'https://opensea.io',
    icon: 'https://opensea.io/favicon.ico',
    chains: [1, 137, 42161],
    category: 'nft',
    featured: true,
    inject_mode: 'proxy',
    status: 'active',
    sort_order: 3,
  },
]

async function seed() {
  console.log('Initializing database schema...')
  await initDB()
  console.log('Schema ready.')

  console.log('Seeding categories...')
  for (const cat of SEED_CATEGORIES) {
    await upsertCategory(cat)
    console.log(`  + ${cat.id}`)
  }

  console.log('Seeding DApps...')
  const existing = await getDApps()
  const existingIds = new Set(existing.map(d => d.id))

  for (const dapp of SEED_DAPPS) {
    if (existingIds.has(dapp.id)) {
      console.log(`  ~ ${dapp.id} (already exists, skipped)`)
      continue
    }
    await createDApp(dapp)
    console.log(`  + ${dapp.id}`)
  }

  console.log('Done! Seeded', SEED_CATEGORIES.length, 'categories and', SEED_DAPPS.length, 'DApps.')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
