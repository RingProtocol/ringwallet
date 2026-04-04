import { safeGetItem, safeSetItem } from '../../utils/safeStorage'

const NOTIFICATION_PROMPT_STORAGE_KEY = 'device_notification_prompted_at'
const NOTIFICATION_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000
const APP_ICON_PATH = '/icons/logo.png'

export type DeviceNotificationPermission =
  | NotificationPermission
  | 'unsupported'

type StandaloneNavigator = Navigator & {
  standalone?: boolean
}

interface BalanceChangeNotificationParams {
  accountAddress: string
  chainName: string
  previousBalance: string
  nextBalance: string
  symbol: string
}

function canUseBrowserApis(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

function isStandaloneMode(): boolean {
  if (!canUseBrowserApis()) return false

  const navigatorWithStandalone = navigator as StandaloneNavigator
  if (navigatorWithStandalone.standalone === true) return true

  return window.matchMedia('(display-mode: standalone)').matches
}

function notificationsSupported(): boolean {
  return canUseBrowserApis() && 'Notification' in window
}

function serviceWorkerSupported(): boolean {
  return canUseBrowserApis() && 'serviceWorker' in navigator
}

function shouldAutoRequestPermission(): boolean {
  const promptedAtRaw = safeGetItem(NOTIFICATION_PROMPT_STORAGE_KEY)
  const promptedAt = promptedAtRaw ? Number(promptedAtRaw) : 0
  if (!Number.isFinite(promptedAt) || promptedAt <= 0) {
    return true
  }

  return Date.now() - promptedAt >= NOTIFICATION_PROMPT_COOLDOWN_MS
}

function markPermissionPrompted(): void {
  safeSetItem(NOTIFICATION_PROMPT_STORAGE_KEY, String(Date.now()))
}

function countFractionDigits(value: string): number {
  const [, fraction = ''] = value.trim().split('.')
  return fraction.length
}

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) return value
  return value.replace(/\.?0+$/, '')
}

function formatSignedDelta(
  previousBalance: string,
  nextBalance: string
): string {
  const previous = Number(previousBalance)
  const next = Number(nextBalance)
  const rawDelta = next - previous
  const precision = Math.max(
    countFractionDigits(previousBalance),
    countFractionDigits(nextBalance),
    4
  )
  const absoluteDelta = Math.abs(rawDelta).toFixed(precision)
  const normalizedDelta = trimTrailingZeros(absoluteDelta)
  return `${rawDelta >= 0 ? '+' : '-'}${normalizedDelta}`
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return null

  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

async function showSystemNotification(
  title: string,
  options: NotificationOptions
): Promise<void> {
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted') return

  const registration = await getServiceWorkerRegistration()
  if (registration) {
    await registration.showNotification(title, options)
    return
  }

  new Notification(title, options)
}

export function getDeviceNotificationPermission(): DeviceNotificationPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission

  markPermissionPrompted()

  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function prepareDeviceNotifications(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!notificationsSupported()) return 'unsupported'
  if (!isStandaloneMode()) return Notification.permission
  if (Notification.permission !== 'default') return Notification.permission
  if (!shouldAutoRequestPermission()) return Notification.permission

  markPermissionPrompted()

  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function notifyBalanceChange({
  accountAddress,
  chainName,
  previousBalance,
  nextBalance,
  symbol,
}: BalanceChangeNotificationParams): Promise<void> {
  if (!notificationsSupported()) return

  const permission = getDeviceNotificationPermission()
  if (permission !== 'granted') return

  const delta = formatSignedDelta(previousBalance, nextBalance)
  const direction =
    Number(nextBalance) >= Number(previousBalance) ? 'increased' : 'decreased'
  const shortAddress = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`

  await showSystemNotification(`Balance ${direction}`, {
    body: `${chainName} ${symbol}: ${delta}\nNow: ${trimTrailingZeros(nextBalance)} ${symbol}\n${shortAddress}`,
    icon: APP_ICON_PATH,
    badge: APP_ICON_PATH,
    tag: `balance-change-${chainName}-${shortAddress}`,
  })
}
