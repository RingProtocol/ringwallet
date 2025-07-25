import { isMobile } from 'react-device-detect'
import { isPWAMode } from './usePWADetection'

type RuntimeEnv = 'not-mobile' | 'mobile-not-installed' | 'pwa'

const useDetectRuntimeEnvironment = () => {
  const isInPWAMode = isPWAMode()

  console.log("运行环境检测结果:", {
    displayMode: typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : false,
    navigatorStandalone: (global.navigator as any)?.standalone,
    isMobile,
    referrer: typeof document !== 'undefined' ? document.referrer : 'undefined',
    historyLength: typeof window !== 'undefined' ? window.history.length : 'undefined',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined',
    finalPWAResult: isInPWAMode
  })

  let envMode: RuntimeEnv = 'not-mobile'

  if (isMobile === false) {
    // 桌面环境
    envMode = isInPWAMode ? 'pwa' : 'not-mobile'
  } else if (isMobile === true) {
    // 移动环境
    envMode = isInPWAMode ? 'pwa' : 'mobile-not-installed'
  }

  // 取消注释以在本地桌面测试PWA模式
  // envMode = 'pwa'

  return envMode
}

// 简化版本，保持向后兼容
const useDetectRuntimeEnvironment2 = () => {
  const isStandaloneMode = (global.navigator as any)?.standalone === true

  let envMode: RuntimeEnv = 'pwa'
  if (isMobile === false) {
    envMode = 'not-mobile'
  } else if (isMobile === true && isStandaloneMode === false) {
    envMode = 'mobile-not-installed'
  } else if (isMobile === true && isStandaloneMode === true) {
    envMode = 'pwa'
  }
  // Uncomment to test locally on desktop
  // envMode = 'pwa'

  return envMode
}

export { useDetectRuntimeEnvironment }
