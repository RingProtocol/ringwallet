# Biometric / Screen Lock Unavailable — Solution Design

When `isUserVerifyingPlatformAuthenticatorAvailable()` returns `false`, the device has **no user verification method** at all (no Face ID, no fingerprint, no PIN/password screen lock). This document defines how to guide the user to resolve the issue.

---

## 1. Core Principle

```
Prioritize booting to enable biometrics → If the device does not support it, downgrade booting to enable screen lock → Screen lock is the minimum requirement
```

WebAuthn `userVerification: "required"` only requires the device to have **any** user verification method to work:

- Face ID / facial recognition
- Touch ID / fingerprint recognition
- Screen lock PIN/password/pattern

So screen lock (PIN/password) is a legal cover-up solution, and Passkey is fully usable in this mode.

---

## 2. Architecture

```
LoginButton
  └─ checkAvailabilityGuard()
├─ isUVPAAAvailable === true → Normal login process
└─ isUVPAAAvailable === false → show <BiometricGuide />
├─ Detection Platform (iOS / Android / Desktop)
├─ Show the corresponding opening steps
├─ Provide "Retest" button
└─ Show screen lock instructions
```

### Component structure

| Components                             | Responsibilities                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `BiometricGuide.tsx`                   | Independent guidance component, showing corresponding steps according to the platform                        |
| `platformDetect.ts` (utility function) | Detect current device platform (iOS / Android / Desktop)                                                     |
| `LoginButton.tsx`                      | Render `<BiometricGuide />` when `isUVPAAAvailable === false`, replacing the current plain text error report |

---

## 3. Platform Detection

Available in `src/utils/platformDetect.ts`:

```typescript
export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
```

---

## 4. Guide Content by Platform

### 4.1 iOS — Enable Face ID / Touch ID

**Master Boot (Biometric):**

1. Open **Settings**
2. Enter **Face ID & Passcode** (or **Touch ID & Passcode**)
3. Enter the lock screen password
4. Turn on **Face ID** (or **Fingerprint**)
5. Return to this application and click **Retest**

**Secure guide (screen lock):**

> If your device doesn't support Face ID or Touch ID, just make sure you set a screen lock password:
> Settings → Face ID & Passcode → Turn on passcode

### 4.2 Android — Enable fingerprint/face recognition

**Master Boot (Biometric):**

1. Open **Settings**
2. Search for **Biometrics** or go to **Security → Biometrics**
3. Set up **Fingerprint** or **Face ID**
4. Follow the prompts to complete the entry
5. Return to this application and click **Retest**

**Secure guide (screen lock):**

> If your device doesn't support biometrics, just set a screen lock:
> Settings → Security → Screen lock → Select PIN/password/pattern

### 4.3 Desktop (macOS / Windows)

**macOS：**

- System Settings → Touch ID & Passcode → Add Fingerprint
- Don’t worry: make sure you have set a login password (System Settings → Users & Groups)

**Windows：**

- Settings → Accounts → Sign-in options → Windows Hello → Set up fingerprint or face
- One-size-fits-all: Make sure you have a PIN set up (Settings → Accounts → Sign-in options → PIN)

---

## 5. BiometricGuide Component Spec

### Props

```typescript
interface BiometricGuideProps {
  onRetry: () => void // Re-detect the callback of the button and call checkAvailabilityGuard again
  isChecking: boolean // Whether it is being rechecked
}
```

### UI structure

```
┌─────────────────────────────────────────┐
│ ⚠️ Need to turn on device verification │
│                                         │
│ Your device does not have biometrics or screen lock turned on, │
│ Unable to log in using Passkey.                   │
│ Please follow the steps below to turn it on: │
│                                         │
│ ── Recommended: Turn on biometrics ── │
│ 1. Open Settings │
│ 2. Enter Face ID and Password │
│  3. ...                                 │
│                                         │
│── Or: Turn on screen lock (minimum requirement)── │
│ If your device does not support biometrics, │
│ Setting a screen lock password is also available.               │
│ Settings → Face ID & Passcode → Turn on passcode │
│                                         │
│ [ 🔄 I have turned it on, check again ] │
└─────────────────────────────────────────┘
```

### Style points

- Use the `info` color tone overall (blue border `#bae6fd`, light blue background `#f0f9ff`), without red (red means error, here is the guide)
- "Recommended" label highlighted with light purple/blue label
- Use gray folding area or lower visual weight for the "bottom" part to avoid overestimating the focus.
- Step numbers are bolded, keywords (such as **Settings**, **Face ID**) are bolded
- The "Recheck" button is placed at the bottom, using the main button style

---

## 6. LoginButton Integration

Modify the behavior when `checkAvailabilityGuard` fails in `LoginButton.tsx`:

**Before (current):**

```typescript
if (!availability.isUVPAAAvailable) {
  setError(
    'Your device does not have biometrics (fingerprint/face) or screen lock enabled, Passkey cannot be used'
  )
  return false
}
```

**After:**

```typescript
if (!availability.isUVPAAAvailable) {
  setShowBiometricGuide(true) //Add new state to control the display of BiometricGuide
  return false
}
```

In JSX, when `showBiometricGuide === true` renders `<BiometricGuide />`, replacing the login button area. After the user clicks "Redetect":

1. Call `PasskeyService.checkAvailability()` again
2. If → `setShowBiometricGuide(false)` is passed, restore the login button
3. If it still fails → Keep the boot page and prompt "Not detected yet, please confirm that the settings have been completed"

Note: When re-detecting, you need to clear the `#supportCache` of `PasskeyService`, or add a `clearCache()` static method.

---

## 7. PasskeyService Changes

Added in `passkeyService.ts`:

```typescript
static clearSupportCache(): void {
  this.#supportCache = null
}
```

Called upon redetection to ensure that expired cached results are not returned.

---

## 8. Edge Cases

| Scene                                                            | Processing                                                                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User has screen lock on but no biometrics                        | Works fine. `isUVPAAAvailable` will return `true`, Passkey uses PIN verification                                                                                 |
| The user returns to the App after following the steps to open it | Click "Re-Detect" to trigger re-detection. The PWA may have updated status in the background, but it still needs to be rechecked manually to be on the safe side |
| Desktop browsers without any authenticator                       | Guided installation of system-level authentication (such as macOS login password, Windows Hello PIN)                                                             |
| The user still fails to test repeatedly                          | Add a prompt after the second failure: "If the problem persists, please try restarting the browser and try again"                                                |
| Enterprise management device has biometrics disabled             | Unable to resolve, prompt user to contact IT administrator                                                                                                       |

---

## 9. Implementation Checklist

1. `src/utils/platformDetect.ts` — platform detection tool function
2. `src/components/BiometricGuide.tsx` + `BiometricGuide.css` — Bootstrap component
3. `src/services/passkeyService.ts` — added `clearSupportCache()`
4. `src/components/LoginButton.tsx` — Integrate `showBiometricGuide` state and `<BiometricGuide />`
