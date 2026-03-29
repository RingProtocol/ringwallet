# Biometric / Screen Lock Unavailable — Solution Design

When `isUserVerifyingPlatformAuthenticatorAvailable()` returns `false`, the device has **no user verification method** at all (no Face ID, no fingerprint, no PIN/password screen lock). This document defines how to guide the user to resolve the issue.

---

## 1. Core Principle

```
优先引导开启生物识别 → 若设备不支持则降级引导开启屏幕锁 → 屏幕锁是最低要求
```

WebAuthn `userVerification: "required"` 只需要设备拥有**任意一种**用户验证方式即可工作：

- Face ID / 面容识别
- Touch ID / 指纹识别
- 屏幕锁 PIN / 密码 / 图案

所以屏幕锁（PIN/密码）是合法的兜底方案，Passkey 在此模式下完全可用。

---

## 2. Architecture

```
LoginButton
  └─ checkAvailabilityGuard()
       ├─ isUVPAAAvailable === true  → 正常登录流程
       └─ isUVPAAAvailable === false → 显示 <BiometricGuide />
                                         ├─ 检测平台 (iOS / Android / Desktop)
                                         ├─ 显示对应的开启步骤
                                         ├─ 提供"重新检测"按钮
                                         └─ 展示屏幕锁兜底说明
```

### 组件结构

| 组件                           | 职责                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `BiometricGuide.tsx`           | 独立引导组件，根据平台展示对应步骤                                                |
| `platformDetect.ts` (工具函数) | 检测当前设备平台 (iOS / Android / Desktop)                                        |
| `LoginButton.tsx`              | 当 `isUVPAAAvailable === false` 时渲染 `<BiometricGuide />`，替代当前的纯文字报错 |

---

## 3. Platform Detection

在 `src/utils/platformDetect.ts` 中提供：

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

### 4.1 iOS — 开启 Face ID / Touch ID

**主引导（生物识别）：**

1. 打开 **设置**
2. 进入 **面容 ID 与密码**（或 **触控 ID 与密码**）
3. 输入锁屏密码
4. 开启 **面容 ID**（或 **指纹**）
5. 返回本应用，点击 **重新检测**

**兜底引导（屏幕锁）：**

> 如果您的设备不支持面容 ID 或触控 ID，只需确保设置了锁屏密码即可：
> 设置 → 面容 ID 与密码 → 开启密码

### 4.2 Android — 开启指纹 / 面部识别

**主引导（生物识别）：**

1. 打开 **设置**
2. 搜索 **生物识别** 或进入 **安全 → 生物识别**
3. 设置 **指纹** 或 **面部识别**
4. 按提示完成录入
5. 返回本应用，点击 **重新检测**

**兜底引导（屏幕锁）：**

> 如果您的设备不支持生物识别，只需设置屏幕锁即可：
> 设置 → 安全 → 屏幕锁定 → 选择 PIN / 密码 / 图案

### 4.3 Desktop (macOS / Windows)

**macOS：**

- 系统设置 → 触控 ID 与密码 → 添加指纹
- 兜底：确保已设置登录密码（系统设置 → 用户与群组）

**Windows：**

- 设置 → 账户 → 登录选项 → Windows Hello → 设置指纹或面部
- 兜底：确保已设置 PIN（设置 → 账户 → 登录选项 → PIN）

---

## 5. BiometricGuide Component Spec

### Props

```typescript
interface BiometricGuideProps {
  onRetry: () => void // 重新检测按钮的回调，重新调用 checkAvailabilityGuard
  isChecking: boolean // 是否正在重新检测中
}
```

### UI 结构

```
┌─────────────────────────────────────────┐
│  ⚠️ 需要开启设备验证                       │
│                                         │
│  您的设备尚未开启生物识别或屏幕锁，            │
│  无法使用 Passkey 登录。                   │
│  请按以下步骤开启：                         │
│                                         │
│  ── 推荐：开启生物识别 ──                   │
│  1. 打开 设置                             │
│  2. 进入 面容 ID 与密码                    │
│  3. ...                                 │
│                                         │
│  ── 或者：开启屏幕锁（最低要求）──            │
│  如果您的设备不支持生物识别，                  │
│  设置一个屏幕锁密码也可以使用。               │
│  设置 → 面容 ID 与密码 → 开启密码           │
│                                         │
│  [ 🔄 我已开启，重新检测 ]                  │
└─────────────────────────────────────────┘
```

### 样式要点

- 整体用 `info` 色调（蓝色边框 `#bae6fd`，浅蓝底 `#f0f9ff`），不用红色（红色意味着错误，这里是引导）
- "推荐"标签用浅紫/蓝标签强调
- "兜底"部分用灰色折叠区域或较低视觉权重，避免喧宾夺主
- 步骤编号加粗，关键词（如 **设置**、**面容 ID**）加粗
- "重新检测"按钮放在最底部，使用主按钮样式

---

## 6. LoginButton Integration

修改 `LoginButton.tsx` 中 `checkAvailabilityGuard` 失败时的行为：

**Before (current):**

```typescript
if (!availability.isUVPAAAvailable) {
  setError('您的设备未启用生物识别(指纹/面容)或屏幕锁，无法使用Passkey')
  return false
}
```

**After:**

```typescript
if (!availability.isUVPAAAvailable) {
  setShowBiometricGuide(true) // 新增 state，控制显示 BiometricGuide
  return false
}
```

在 JSX 中，当 `showBiometricGuide === true` 时渲染 `<BiometricGuide />`，替代登录按钮区域。用户点击"重新检测"后：

1. 重新调用 `PasskeyService.checkAvailability()`
2. 若通过 → `setShowBiometricGuide(false)`，恢复登录按钮
3. 若仍不通过 → 保持引导页，提示"仍未检测到，请确认已完成设置"

注意：重新检测时需清除 `PasskeyService` 的 `#supportCache`，或新增一个 `clearCache()` 静态方法。

---

## 7. PasskeyService Changes

在 `passkeyService.ts` 中新增：

```typescript
static clearSupportCache(): void {
  this.#supportCache = null
}
```

在重新检测时调用，确保不会返回过期的缓存结果。

---

## 8. Edge Cases

| 场景                           | 处理                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| 用户开启了屏幕锁但没有生物识别 | 正常工作。`isUVPAAAvailable` 会返回 `true`，Passkey 使用 PIN 验证              |
| 用户跟着步骤开启后返回 App     | 点"重新检测"触发重新检测。PWA 在后台可能已更新状态，但保险起见仍需手动重新检测 |
| 桌面浏览器无任何认证器         | 引导安装系统级认证（如 macOS 登录密码、Windows Hello PIN）                     |
| 用户反复检测仍失败             | 第二次失败后增加提示："如果问题持续，请尝试重启浏览器后再试"                   |
| 企业管理设备禁用了生物识别     | 无法解决，提示用户联系 IT 管理员                                               |

---

## 9. Implementation Checklist

1. `src/utils/platformDetect.ts` — 平台检测工具函数
2. `src/components/BiometricGuide.tsx` + `BiometricGuide.css` — 引导组件
3. `src/services/passkeyService.ts` — 新增 `clearSupportCache()`
4. `src/components/LoginButton.tsx` — 集成 `showBiometricGuide` state 和 `<BiometricGuide />`
