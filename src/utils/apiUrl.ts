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

  const { protocol, hostname, origin, port } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (isLocalhost && port === '3003') {
    return new URL(normalizedPath, `${protocol}//${hostname}:3000`)
  }

  return new URL(normalizedPath, origin)
}
