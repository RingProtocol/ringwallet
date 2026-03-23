const DEFAULT_DAPP_PROXY_BASE = 'http://127.0.0.1:80'

function env(key: string): string | undefined {
  const val = (import.meta.env as Record<string, string | undefined>)[key]
  return val?.trim() || undefined
}

/** Origin (and optional path prefix) of the remote HTML proxy; no trailing slash. */
export function getDappProxyBase(): string {
  return env('VITE_DAPP_PROXY_BASE_URL') ?? DEFAULT_DAPP_PROXY_BASE
}

/** iframe src for proxy mode: `{base}/?url={encodeURIComponent(dappUrl)}` */
export function buildDappProxyIframeUrl(dappUrl: string): string {
  const base = getDappProxyBase().replace(/\/+$/, '')
  return `${base}/?url=${encodeURIComponent(dappUrl)}`
}
