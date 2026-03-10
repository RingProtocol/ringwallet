import { neon } from '@neondatabase/serverless'

let _sql = null

export function getSQL() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL environment variable is not set')
    _sql = neon(url)
  }
  return _sql
}

// ─── Schema creation ───

export async function initDB() {
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
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_dapps_status ON dapps(status)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_dapps_category ON dapps(category)
  `
}

// ─── Categories CRUD ───

export async function getCategories() {
  const sql = getSQL()
  return sql`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`
}

export async function upsertCategory(cat) {
  const sql = getSQL()
  return sql`
    INSERT INTO categories (id, name, icon, sort_order)
    VALUES (${cat.id}, ${cat.name}, ${cat.icon || ''}, ${cat.sort_order || 0})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order
    RETURNING *
  `
}

export async function deleteCategory(id) {
  const sql = getSQL()
  return sql`DELETE FROM categories WHERE id = ${id} RETURNING *`
}

// ─── DApps CRUD ───

export async function getDApps(filters = {}) {
  const sql = getSQL()
  const { status, category, featured } = filters

  if (status && category) {
    return sql`
      SELECT * FROM dapps
      WHERE status = ${status} AND category = ${category}
      ORDER BY sort_order ASC, name ASC
    `
  }
  if (status) {
    return sql`
      SELECT * FROM dapps WHERE status = ${status}
      ORDER BY sort_order ASC, name ASC
    `
  }
  if (featured !== undefined) {
    return sql`
      SELECT * FROM dapps WHERE featured = ${featured} AND status = 'active'
      ORDER BY sort_order ASC, name ASC
    `
  }
  return sql`SELECT * FROM dapps ORDER BY sort_order ASC, name ASC`
}

export async function getDAppById(id) {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM dapps WHERE id = ${id}`
  return rows[0] || null
}

export async function createDApp(dapp) {
  const sql = getSQL()
  return sql`
    INSERT INTO dapps (name, description, url, icon, chains, category, featured, inject_mode, status, sort_order)
    VALUES (
      ${dapp.name},
      ${dapp.description || ''},
      ${dapp.url},
      ${dapp.icon || ''},
      ${JSON.stringify(dapp.chains || [])},
      ${dapp.category || null},
      ${dapp.featured || false},
      ${dapp.inject_mode || 'sdk'},
      ${dapp.status || 'active'},
      ${dapp.sort_order || 0}
    )
    RETURNING *
  `
}

export async function updateDApp(id, updates) {
  const sql = getSQL()
  const dapp = await getDAppById(id)
  if (!dapp) return null

  const merged = { ...dapp, ...updates, updated_at: new Date().toISOString() }

  return sql`
    UPDATE dapps SET
      name = ${merged.name},
      description = ${merged.description},
      url = ${merged.url},
      icon = ${merged.icon},
      chains = ${JSON.stringify(merged.chains)},
      category = ${merged.category},
      featured = ${merged.featured},
      inject_mode = ${merged.inject_mode},
      status = ${merged.status},
      sort_order = ${merged.sort_order},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
}

export async function deleteDApp(id) {
  const sql = getSQL()
  return sql`DELETE FROM dapps WHERE id = ${id} RETURNING *`
}
