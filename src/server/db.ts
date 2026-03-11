import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import crypto from 'crypto'

let _sql: NeonQueryFunction<false, false> | null = null

/** 8-char API key (same alphabet as admin UI randomApiKey8). */
function randomApiKey8(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

function getSQL() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL environment variable is not set')
    _sql = neon(url)
  }
  return _sql
}

// ─── Schema ───

let _initialized = false

export async function initDB() {
  if (_initialized) return
  const sql = getSQL()

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      icon        TEXT DEFAULT '',
      sort_order  INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // dapps.id is SERIAL (auto-increment integer). Existing DBs with TEXT id must be migrated.
  await sql`
    CREATE TABLE IF NOT EXISTS dapps (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT DEFAULT '',
      url           TEXT NOT NULL,
      icon          TEXT DEFAULT '',
      chains        JSONB DEFAULT '[]',
      category      TEXT REFERENCES categories(id) ON DELETE SET NULL,
      featured      BOOLEAN DEFAULT false,
      inject_mode   TEXT DEFAULT 'sdk' CHECK (inject_mode IN ('proxy', 'sdk')),
      status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated')),
      sort_order    INTEGER DEFAULT 0,
      apikey        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_dapps_status ON dapps(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_dapps_category ON dapps(category)`

  _initialized = true
}

export async function ensureDB() {
  try { await initDB() } catch (err) {
    console.error('[DB] init error:', (err as Error).message)
  }
}

// ─── Categories ───

export async function getCategories() {
  const sql = getSQL()
  return sql`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`
}

export async function upsertCategory(cat: { id: string; name: string; icon?: string; sort_order?: number }) {
  const sql = getSQL()
  return sql`
    INSERT INTO categories (id, name, icon, sort_order)
    VALUES (${cat.id}, ${cat.name}, ${cat.icon || ''}, ${cat.sort_order || 0})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
    RETURNING *
  `
}

export async function deleteCategory(id: string) {
  const sql = getSQL()
  return sql`DELETE FROM categories WHERE id = ${id} RETURNING *`
}

// ─── DApps ───

interface DAppFilters {
  status?: string
  category?: string
  featured?: boolean
}

export async function getDApps(filters: DAppFilters = {}) {
  const sql = getSQL()
  const { status, category, featured } = filters

  if (status && category) {
    return sql`SELECT * FROM dapps WHERE status = ${status} AND category = ${category} ORDER BY sort_order ASC, name ASC`
  }
  if (status) {
    return sql`SELECT * FROM dapps WHERE status = ${status} ORDER BY sort_order ASC, name ASC`
  }
  if (featured !== undefined) {
    return sql`SELECT * FROM dapps WHERE featured = ${featured} AND status = 'active' ORDER BY sort_order ASC, name ASC`
  }
  return sql`SELECT * FROM dapps ORDER BY sort_order ASC, name ASC`
}

export async function getDAppById(id: number) {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM dapps WHERE id = ${id}`
  return rows[0] || null
}

export async function getDAppByApiKey(apikey: string) {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM dapps WHERE apikey = ${apikey}`
  return rows[0] || null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createDApp(dapp: Record<string, any>) {
  const sql = getSQL()
  return sql`
    INSERT INTO dapps (name, description, url, icon, chains, category, featured, inject_mode, status, sort_order, apikey)
    VALUES (
      ${dapp.name}, ${dapp.description || ''}, ${dapp.url}, ${dapp.icon || ''},
      ${JSON.stringify(dapp.chains || [])}, ${dapp.category || null},
      ${dapp.featured || false}, ${dapp.inject_mode || 'sdk'},
      ${dapp.status || 'active'}, ${dapp.sort_order || 0},
      ${dapp.apikey || randomApiKey8()}
    )
    RETURNING *
  `
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateDApp(id: number, updates: Record<string, any>) {
  const sql = getSQL()
  const dapp = await getDAppById(id)
  if (!dapp) return null

  const m = { ...dapp, ...updates }
  return sql`
    UPDATE dapps SET
      name = ${m.name}, description = ${m.description}, url = ${m.url}, icon = ${m.icon},
      chains = ${JSON.stringify(m.chains)}, category = ${m.category},
      featured = ${m.featured}, inject_mode = ${m.inject_mode},
      status = ${m.status}, sort_order = ${m.sort_order},
      apikey = ${m.apikey}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
}

export async function deleteDApp(id: number) {
  const sql = getSQL()
  return sql`DELETE FROM dapps WHERE id = ${id} RETURNING *`
}
