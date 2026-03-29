function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return value?.trim() || undefined
}

export function resolveClientApiUrl(path: string): URL {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const configuredBase =
    env('VITE_API_BASE_URL') ||
    env('VITE_WALLET_WEB_BASE_URL') ||
    env('VITE_NEXT_BASE_URL')

  if (configuredBase) {
    return new URL(normalizedPath, configuredBase)
  }

  if (typeof window === 'undefined') {
    throw new Error('resolveClientApiUrl is only available in the browser')
  }

  return new URL(normalizedPath, window.location.origin)
}
