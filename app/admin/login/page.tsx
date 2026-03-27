'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAdminToken } from '../auth-client'

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#18181b',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 24px',
    color: '#a1a1aa',
    fontSize: 14,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: 15,
    border: '1px solid #3f3f46',
    borderRadius: 8,
    background: '#27272a',
    color: '#e4e4e7',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    background: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
  error: {
    marginTop: 12,
    color: '#f87171',
    fontSize: 14,
  },
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      setAdminToken(token)
      router.replace('/admin/dapps')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin</h1>
        <p style={styles.subtitle}>Enter admin token to sign in</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  )
}
