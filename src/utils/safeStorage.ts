/**
 * Safe localStorage wrapper that never throws.
 *
 * Safari throws SecurityError when localStorage is unavailable
 * (private browsing, cookies disabled, cross-site tracking prevention, etc.).
 * All functions here swallow those errors and return sensible defaults,
 * so the rest of the app can run without storage as a degraded experience.
 */

let storageAvailable: boolean | null = null

function isAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable
  try {
    const key = '__storage_probe__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
  return storageAvailable
}

export function safeGetItem(key: string): string | null {
  if (!isAvailable()) return null
  try { return localStorage.getItem(key) } catch { return null }
}

export function safeSetItem(key: string, value: string): void {
  if (!isAvailable()) return
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

export function safeRemoveItem(key: string): void {
  if (!isAvailable()) return
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

export function safeKeys(): string[] {
  if (!isAvailable()) return []
  try { return Object.keys(localStorage) } catch { return [] }
}
