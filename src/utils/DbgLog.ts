const isBrowser = typeof window !== 'undefined'
const isNgrokHost =
  isBrowser && window.location.hostname.endsWith('.ngrok-free.dev')

const ENABLED =
  isBrowser && (window.location.hostname === 'localhost' || isNgrokHost)

export function log(message: string, ...args: unknown[]): void {
  if (ENABLED) {
    console.warn(message, ...args)
  }
}

export function error(message: string, ...args: unknown[]): void {
  if (ENABLED) {
    console.error(message, ...args)
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (ENABLED) {
    console.warn(message, ...args)
  }
}

export function info(message: string, ...args: unknown[]): void {
  if (ENABLED) {
    console.warn(message, ...args)
  }
}
