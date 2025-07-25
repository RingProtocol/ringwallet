import { useState, useEffect } from 'react'

interface PWADetectionResult {
    isPWA: boolean
    isInstalled: boolean
    canInstall: boolean
    installMethod: 'chrome' | 'safari' | 'edge' | 'firefox' | 'unknown'
    displayMode: string
    details: {
        standalone: boolean
        displayModeStandalone: boolean
        navigatorStandalone: boolean
        hasNoReferrer: boolean
        isFromHomeScreen: boolean
        beforeInstallPrompt: boolean
    }
}

const usePWADetection = (): PWADetectionResult => {
    const [result, setResult] = useState<PWADetectionResult>({
        isPWA: false,
        isInstalled: false,
        canInstall: false,
        installMethod: 'unknown',
        displayMode: 'browser',
        details: {
            standalone: false,
            displayModeStandalone: false,
            navigatorStandalone: false,
            hasNoReferrer: false,
            isFromHomeScreen: false,
            beforeInstallPrompt: false
        }
    })

    useEffect(() => {
        if (typeof window === 'undefined') return

        const detectPWA = () => {
            // 检测浏览器类型
            const userAgent = navigator.userAgent.toLowerCase()
            let installMethod: PWADetectionResult['installMethod'] = 'unknown'

            if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
                installMethod = 'chrome'
            } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
                installMethod = 'safari'
            } else if (userAgent.includes('edg')) {
                installMethod = 'edge'
            } else if (userAgent.includes('firefox')) {
                installMethod = 'firefox'
            }

            // 检测display-mode (Chrome, Edge, Firefox支持)
            const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
            const displayModeFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
            const displayModeMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches

            let displayMode = 'browser'
            if (displayModeStandalone) displayMode = 'standalone'
            else if (displayModeFullscreen) displayMode = 'fullscreen'
            else if (displayModeMinimalUI) displayMode = 'minimal-ui'

            // 检测navigator.standalone (Safari/iOS支持)
            const navigatorStandalone = (navigator as any)?.standalone === true

            // 检测是否从主屏幕启动
            const hasNoReferrer = !document.referrer || document.referrer === ''
            const isFromHomeScreen = hasNoReferrer && window.history.length === 1

            // 检测beforeinstallprompt事件支持
            const beforeInstallPrompt = 'onbeforeinstallprompt' in window

            // 综合判断是否为PWA模式
            const standalone = displayModeStandalone || navigatorStandalone
            const isPWA = standalone || (isFromHomeScreen && (installMethod === 'chrome' || installMethod === 'edge'))

            // 判断是否已安装
            const isInstalled = standalone

            // 判断是否可以安装
            const canInstall = beforeInstallPrompt && !isInstalled

            const newResult: PWADetectionResult = {
                isPWA,
                isInstalled,
                canInstall,
                installMethod,
                displayMode,
                details: {
                    standalone,
                    displayModeStandalone,
                    navigatorStandalone,
                    hasNoReferrer,
                    isFromHomeScreen,
                    beforeInstallPrompt
                }
            }

            setResult(newResult)

            // 调试信息
            console.log('PWA检测详情:', {
                userAgent: navigator.userAgent,
                ...newResult
            })
        }

        detectPWA()

        // 监听display-mode变化
        const mediaQuery = window.matchMedia('(display-mode: standalone)')
        const handleChange = () => detectPWA()

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        } else {
            // 兼容旧版浏览器
            mediaQuery.addListener(handleChange)
            return () => mediaQuery.removeListener(handleChange)
        }
    }, [])

    return result
}

// 简单的PWA检测函数
export const isPWAMode = (): boolean => {
    if (typeof window === 'undefined') return false

    // Chrome/Edge: 检查display-mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true
    }

    // Safari: 检查navigator.standalone
    if ((navigator as any)?.standalone === true) {
        return true
    }

    return false
}

// 检测PWA是否已安装
export const isPWAInstalled = (): boolean => {
    return isPWAMode()
}

// 检测是否可以安装PWA
export const canInstallPWA = (): boolean => {
    if (typeof window === 'undefined') return false
    return 'onbeforeinstallprompt' in window && !isPWAMode()
}

export default usePWADetection