/**
 * iOS 16+ supports passkeys via device passcode even when Face ID / Touch ID
 * is not enrolled or not enabled for iPhone unlock.
 * `isUserVerifyingPlatformAuthenticatorAvailable()` still returns false in
 * that scenario (especially in Chrome/WKWebView), so we detect the platform
 * and treat it as available when the WebAuthn API itself exists.
 */
export function isIOSWithPasscodeCapable(): boolean {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIOS) return false

  const versionMatch = ua.match(/OS (\d+)/)
  const majorVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0
  return majorVersion >= 16
}
