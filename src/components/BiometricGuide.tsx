import React, { useState } from 'react'
import { detectPlatform, type Platform } from '../utils/platformDetect'
import './BiometricGuide.css'

interface BiometricGuideProps {
  onRetry: () => void
  isChecking: boolean
}

interface PlatformGuide {
  biometricTitle: string
  biometricSteps: string[]
  fallbackTitle: string
  fallbackSteps: string[]
}

const GUIDES: Record<Platform, PlatformGuide> = {
  ios: {
    biometricTitle: '开启面容 ID / 触控 ID',
    biometricSteps: [
      '打开 **设置**',
      '进入 **面容 ID 与密码**（或 **触控 ID 与密码**）',
      '输入锁屏密码',
      '开启 **面容 ID**（或添加 **指纹**）',
      '返回本应用，点击下方「重新检测」',
    ],
    fallbackTitle: '或者：开启屏幕锁密码',
    fallbackSteps: [
      '打开 **设置** → **面容 ID 与密码**',
      '点击 **开启密码**，设置一个数字密码即可',
    ],
  },
  android: {
    biometricTitle: '开启指纹 / 面部识别',
    biometricSteps: [
      '打开 **设置**',
      '搜索 **生物识别** 或进入 **安全 → 生物识别**',
      '设置 **指纹** 或 **面部识别**',
      '按提示完成录入',
      '返回本应用，点击下方「重新检测」',
    ],
    fallbackTitle: '或者：开启屏幕锁',
    fallbackSteps: [
      '打开 **设置** → **安全** → **屏幕锁定**',
      '选择 **PIN** / **密码** / **图案** 并完成设置',
    ],
  },
  macos: {
    biometricTitle: '开启触控 ID',
    biometricSteps: [
      '打开 **系统设置**',
      '进入 **触控 ID 与密码**',
      '点击 **添加指纹** 并完成录入',
      '返回本应用，点击下方「重新检测」',
    ],
    fallbackTitle: '或者：确保已设置登录密码',
    fallbackSteps: [
      '打开 **系统设置** → **用户与群组**',
      '确保当前账户已设置 **登录密码**',
    ],
  },
  windows: {
    biometricTitle: '开启 Windows Hello',
    biometricSteps: [
      '打开 **设置**',
      '进入 **账户** → **登录选项**',
      '在 **Windows Hello** 下设置 **指纹** 或 **面部识别**',
      '按提示完成录入',
      '返回本应用，点击下方「重新检测」',
    ],
    fallbackTitle: '或者：设置 PIN',
    fallbackSteps: [
      '打开 **设置** → **账户** → **登录选项**',
      '在 **PIN (Windows Hello)** 下点击 **设置**',
    ],
  },
  desktop: {
    biometricTitle: '开启系统生物识别',
    biometricSteps: [
      '打开系统 **设置 / 偏好设置**',
      '找到 **安全** 或 **登录选项**',
      '开启 **指纹** 或 **面部识别**',
      '返回本应用，点击下方「重新检测」',
    ],
    fallbackTitle: '或者：设置屏幕锁 / 登录密码',
    fallbackSteps: [
      '在系统设置中确保已设置 **登录密码** 或 **PIN**',
    ],
  },
}

function renderBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  )
}

const BiometricGuide: React.FC<BiometricGuideProps> = ({ onRetry, isChecking }) => {
  const [retryCount, setRetryCount] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const platform = detectPlatform()
  const guide = GUIDES[platform]

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    onRetry()
  }

  return (
    <div className="biometric-guide">
      <div className="biometric-guide-header">
        <span className="biometric-guide-icon">🔐</span>
        <h3>需要开启设备验证</h3>
      </div>

      <p className="biometric-guide-desc">
        您的设备尚未开启生物识别或屏幕锁，无法使用 Passkey 登录。请按以下步骤开启：
      </p>

      <div className="biometric-guide-section biometric-guide-primary">
        <div className="biometric-guide-section-label">推荐</div>
        <h4>{guide.biometricTitle}</h4>
        <ol className="biometric-guide-steps">
          {guide.biometricSteps.map((step, i) => (
            <li key={i}>{renderBoldText(step)}</li>
          ))}
        </ol>
      </div>

      {!showFallback ? (
        <button
          className="biometric-guide-toggle"
          onClick={() => setShowFallback(true)}
        >
          设备不支持生物识别？查看替代方案 ›
        </button>
      ) : (
        <div className="biometric-guide-section biometric-guide-fallback">
          <h4>{guide.fallbackTitle}</h4>
          <p className="biometric-guide-fallback-hint">
            即使没有指纹/面容，设置屏幕锁密码后也可以正常使用。
          </p>
          <ol className="biometric-guide-steps">
            {guide.fallbackSteps.map((step, i) => (
              <li key={i}>{renderBoldText(step)}</li>
            ))}
          </ol>
        </div>
      )}

      <button
        className="biometric-guide-retry"
        onClick={handleRetry}
        disabled={isChecking}
      >
        {isChecking ? '检测中...' : '我已开启，重新检测'}
      </button>

      {retryCount >= 2 && (
        <p className="biometric-guide-hint">
          仍未检测到？请尝试重启浏览器后再试。
        </p>
      )}
    </div>
  )
}

export default BiometricGuide
