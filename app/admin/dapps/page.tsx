'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminToken, clearAdminToken, adminHeaders } from '../auth-client'

interface Category {
  id: string
  name: string
  icon: string
  sort_order: number
}

interface DApp {
  id: number
  name: string
  description: string
  url: string
  icon: string
  chains: number[]
  category: string | null
  featured: boolean
  inject_mode: 'proxy' | 'sdk'
  status: 'active' | 'maintenance' | 'deprecated'
  sort_order: number
  apikey: string
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 960, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 22, fontWeight: 600 },
  actions: { display: 'flex', gap: 8 },
  btn: { padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer', textDecoration: 'none' },
  btnPrimary: { background: '#3b82f6', color: '#fff' },
  btnSecondary: { background: '#3f3f46', color: '#e4e4e7' },
  btnDanger: { background: '#dc2626', color: '#fff' },
  tableWrap: { overflowX: 'auto', background: '#18181b', borderRadius: 12, border: '1px solid #27272a' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #27272a', color: '#a1a1aa', fontWeight: 500, fontSize: 13 },
  td: { padding: '12px 16px', borderBottom: '1px solid #27272a', fontSize: 14 },
  cellActions: { display: 'flex', gap: 8 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 },
  modal: { background: '#18181b', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { margin: '0 0 20px', fontSize: 18 },
  formRow: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 6, fontSize: 13, color: '#a1a1aa' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #3f3f46', borderRadius: 8, background: '#27272a', color: '#e4e4e7', fontSize: 14 },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #3f3f46', borderRadius: 8, background: '#27272a', color: '#e4e4e7', fontSize: 14 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalActions: { display: 'flex', gap: 8, marginTop: 24 },
  error: { color: '#f87171', fontSize: 14, marginTop: 8 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12 },
  badgeActive: { background: '#166534', color: '#86efac' },
  badgeMaintenance: { background: '#854d0e', color: '#fde047' },
  badgeDeprecated: { background: '#7f1d1d', color: '#fca5a5' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#a1a1aa', wordBreak: 'break-all' },
  apikeyWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  btnTiny: { padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer', background: '#3f3f46', color: '#e4e4e7' },
}

function statusBadge(status: string) {
  const s = status === 'active' ? styles.badgeActive : status === 'maintenance' ? styles.badgeMaintenance : styles.badgeDeprecated
  return <span style={{ ...styles.badge, ...s }}>{status}</span>
}

function randomApiKey8(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export default function AdminDAppsPage() {
  const router = useRouter()
  const [dapps, setDapps] = useState<DApp[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<DApp>>({
    name: '',
    description: '',
    url: '',
    icon: '',
    chains: [],
    category: null,
    featured: false,
    status: 'active',
    sort_order: 0,
  })
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      router.replace('/admin/login')
      return
    }
    load()
  }, [router])

  async function load() {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [dres, cres] = await Promise.all([
        fetch('/api/admin/dapps', { headers: adminHeaders() }),
        fetch('/api/admin/categories', { headers: adminHeaders() }),
      ])
      if (dres.status === 401 || cres.status === 401) {
        clearAdminToken()
        router.replace('/admin/login')
        return
      }
      if (!dres.ok) throw new Error(await dres.text())
      if (!cres.ok) throw new Error(await cres.text())
      const ddata = await dres.json()
      const cdata = await cres.json()
      setDapps(ddata.dapps || [])
      setCategories(cdata.categories || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({
      name: '',
      description: '',
      url: '',
      icon: '',
      chains: [],
      category: null,
      featured: false,
      inject_mode: 'sdk',
      status: 'active',
      sort_order: 0,
    })
    setEditingId(null)
    setModal('add')
    setSubmitError('')
  }

  function openEdit(d: DApp) {
    setForm({
      name: d.name,
      description: d.description || '',
      url: d.url,
      icon: d.icon || '',
      chains: d.chains || [],
      category: d.category,
      featured: d.featured,
      inject_mode: d.inject_mode,
      status: d.status,
      sort_order: d.sort_order ?? 0,
      apikey: d.apikey,
    })
    setEditingId(d.id)
    setModal('edit')
    setSubmitError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSaving(true)
    try {
      if (modal === 'add') {
        if (!form.name?.trim() || !form.url?.trim()) {
          setSubmitError('Name and URL are required')
          return
        }
        const res = await fetch('/api/admin/dapps', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description || '',
            url: form.url.trim(),
            icon: form.icon || '',
            chains: form.chains ?? [],
            category: form.category || null,
            featured: form.featured ?? false,
            inject_mode: form.inject_mode || 'sdk',
            status: form.status || 'active',
            sort_order: form.sort_order ?? 0,
            ...(form.apikey ? { apikey: form.apikey } : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || res.statusText)
        await load()
        setModal(null)
      } else {
        if (!editingId) return
        const res = await fetch(`/api/admin/dapps/${editingId}`, {
          method: 'PUT',
          headers: adminHeaders(),
          body: JSON.stringify({
            name: form.name?.trim(),
            description: form.description || '',
            url: form.url?.trim(),
            icon: form.icon || '',
            chains: form.chains ?? [],
            category: form.category || null,
            featured: form.featured ?? false,
            inject_mode: form.inject_mode || 'sdk',
            status: form.status || 'active',
            sort_order: form.sort_order ?? 0,
            apikey: form.apikey,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || res.statusText)
        await load()
        setModal(null)
      }
    } catch (e) {
      setSubmitError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(`Delete DApp "${id}"?`)) return
    try {
      const res = await fetch(`/api/admin/dapps/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      if (res.status === 401) {
        clearAdminToken()
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function handleLogout() {
    clearAdminToken()
    router.replace('/admin/login')
  }

  if (typeof window !== 'undefined' && !getAdminToken()) {
    return null
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={styles.title}>DApp Management</h1>
        <div style={styles.actions}>
          <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={openAdd}>
            Add DApp
          </button>
          <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handleLogout}>
            Sign out
          </button>
          <Link href="/" style={{ ...styles.btn, ...styles.btnSecondary }}>
            Back to wallet
          </Link>
        </div>
      </header>

      {error && <p style={styles.error}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                  <th style={styles.th}>API Key</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Featured</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dapps.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.id}</td>
                  <td style={styles.td}>{d.name}</td>
                  <td style={styles.td}><span style={styles.mono}>{d.apikey}</span></td>
                  <td style={styles.td}>{statusBadge(d.status)}</td>
                  <td style={styles.td}>{d.category || '—'}</td>
                  <td style={styles.td}>{d.featured ? 'Yes' : 'No'}</td>
                  <td style={styles.td}>
                    <div style={styles.cellActions}>
                      <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => openEdit(d)}>
                        Edit
                      </button>
                      <button type="button" style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => handleDelete(d.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dapps.length === 0 && (
            <p style={{ padding: 24, textAlign: 'center', color: '#71717a' }}>No DApps yet. Click "Add DApp" to create one.</p>
          )}
        </div>
      )}

      {modal && (
        <div style={styles.modalOverlay} onClick={() => setModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{modal === 'add' ? 'Add DApp' : 'Edit DApp'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <label style={styles.label}>Name *</label>
                <input
                  style={styles.input}
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Display name"
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>URL *</label>
                <input
                  style={styles.input}
                  type="url"
                  value={form.url || ''}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Description</label>
                <input
                  style={styles.input}
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Icon URL</label>
                <input
                  style={styles.input}
                  value={form.icon || ''}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>API Key</label>
                <div style={styles.apikeyWrap}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={form.apikey || '(auto-generated)'}
                    readOnly
                  />
                  <button
                    type="button"
                    style={styles.btnTiny}
                    onClick={() => setForm((f) => ({ ...f, apikey: randomApiKey8() }))}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Category</label>
                <select
                  style={styles.select}
                  value={form.category ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || null }))}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <input type="hidden" value="sdk" />
              <div style={styles.formRow}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.select}
                  value={form.status || 'active'}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DApp['status'] }))}
                >
                  <option value="active">active</option>
                  <option value="maintenance">maintenance</option>
                  <option value="deprecated">deprecated</option>
                </select>
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Sort Order</label>
                <input
                  style={styles.input}
                  type="number"
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.featured ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                <label htmlFor="featured" style={styles.label}>Featured</label>
              </div>
              {submitError && <p style={styles.error}>{submitError}</p>}
              <div style={styles.modalActions}>
                <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
