'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { safeGetItem, safeSetItem } from './utils/safeStorage'

export type Lang = 'en' | 'zh'

type Vars = Record<string, string | number>

const STORAGE_KEY = 'ring_wallet_lang'
const EXPLICIT_STORAGE_KEY = 'ring_wallet_lang_explicit'

const messages = {
  en: {
    account: 'Account',
    switchAccount: 'Switch wallet',
    notifications: 'Notifications',
    notificationsStatusEnabled: 'Enabled',
    notificationsStatusBlocked: 'Blocked',
    notificationsStatusUnsupported: 'Unsupported',
    notificationsStatusTapToEnable: 'Tap to enable',
    notificationsEnabledMessage: 'Notifications are enabled for this app.',
    notificationsBlockedMessage:
      'Notifications are blocked. Re-enable them in your browser or device settings.',
    notificationsUnsupportedMessage:
      'Notifications are not supported here. On iPhone, install the PWA to the Home Screen first.',
    notificationsPermissionPendingMessage:
      'Permission was not granted yet. Tap again if you want to retry.',
    feedback: 'Feedback',
    about: 'About',
    logout: 'Log out',
    wallet: 'Wallet',
    copy: 'Copy',
    copied: 'Copied',
    copiedToClipboard: 'Copied to clipboard',
    close: 'Close',
    language: 'Language',
    english: 'English',
    chinese: '中文',
    syncing: 'Syncing...',
    migrateFromAndroid: 'Migrate from Android',
    syncSuccessTitle: 'Account sync succeeded',
    syncSuccessBody:
      'A Passkey has been created on this device with the same wallet keys.\nNext time you can log in on this device using biometrics without scanning a QR code.',
    syncFailed: 'Sync failed',
    syncErrorPrefix: 'Sync error: {message}',
    login: 'Log in',
    loggingIn: 'Logging in...',
    createAccount: 'Create account',
    creating: 'Creating...',
    noAccountFound: 'No existing account found',
    loginTipNoPasskey:
      'Tip: If you haven’t created a passkey before, tap “Create account”.',
    passkeyNeedsSecureContext:
      'Passkey only works in a secure context (HTTPS).',
    passkeyApiUnavailable:
      'Your browser does not support Passkey. Please upgrade Chrome/Edge/Safari.',
    biometricNotDetected:
      'Still no device verification detected. Please finish setup.',
    biometricGuideTitle: 'Device verification required',
    biometricGuideDesc:
      'Your device has not enabled biometrics or a screen lock, so Passkey login is unavailable. Follow the steps below to enable it:',
    biometricGuideRecommended: 'Recommended',
    biometricGuideToggleFallback:
      'No biometrics on this device? See alternatives ›',
    biometricGuideFallbackHint:
      'Even without Face ID / fingerprint, you can use Passkey normally after setting a screen lock.',
    biometricGuideChecking: 'Checking...',
    biometricGuideRetry: 'Enabled — check again',
    biometricGuideRetryHint:
      'Still not detected? Try restarting your browser and try again.',
    bioIosBiometricTitle: 'Enable Face ID / Touch ID',
    bioIosBiometricStep1: 'Open **Settings**',
    bioIosBiometricStep2:
      'Go to **Face ID & Passcode** (or **Touch ID & Passcode**)',
    bioIosBiometricStep3: 'Enter your device passcode',
    bioIosBiometricStep4: 'Enable **Face ID** (or add a **fingerprint**)',
    bioIosBiometricStep5:
      'Return to this app and tap “Enabled — check again” below',
    bioIosFallbackTitle: 'Or: enable a device passcode',
    bioIosFallbackStep1: 'Open **Settings** → **Face ID & Passcode**',
    bioIosFallbackStep2: 'Tap **Turn Passcode On** and set a numeric passcode',
    bioAndroidBiometricTitle: 'Enable fingerprint / face unlock',
    bioAndroidBiometricStep1: 'Open **Settings**',
    bioAndroidBiometricStep2:
      'Search **Biometrics** or go to **Security → Biometrics**',
    bioAndroidBiometricStep3: 'Set up **Fingerprint** or **Face unlock**',
    bioAndroidBiometricStep4: 'Follow the prompts to finish enrollment',
    bioAndroidBiometricStep5:
      'Return to this app and tap “Enabled — check again” below',
    bioAndroidFallbackTitle: 'Or: enable a screen lock',
    bioAndroidFallbackStep1:
      'Open **Settings** → **Security** → **Screen lock**',
    bioAndroidFallbackStep2:
      'Choose **PIN** / **Password** / **Pattern** and finish setup',
    bioMacosBiometricTitle: 'Enable Touch ID',
    bioMacosBiometricStep1: 'Open **System Settings**',
    bioMacosBiometricStep2: 'Go to **Touch ID & Password**',
    bioMacosBiometricStep3: 'Click **Add Fingerprint** and finish enrollment',
    bioMacosBiometricStep4:
      'Return to this app and tap “Enabled — check again” below',
    bioMacosFallbackTitle: 'Or: make sure a login password is set',
    bioMacosFallbackStep1: 'Open **System Settings** → **Users & Groups**',
    bioMacosFallbackStep2: 'Make sure your account has a **login password**',
    bioWindowsBiometricTitle: 'Enable Windows Hello',
    bioWindowsBiometricStep1: 'Open **Settings**',
    bioWindowsBiometricStep2: 'Go to **Accounts** → **Sign-in options**',
    bioWindowsBiometricStep3:
      'Under **Windows Hello**, set up **Fingerprint** or **Face recognition**',
    bioWindowsBiometricStep4: 'Follow the prompts to finish enrollment',
    bioWindowsBiometricStep5:
      'Return to this app and tap “Enabled — check again” below',
    bioWindowsFallbackTitle: 'Or: set up a PIN',
    bioWindowsFallbackStep1:
      'Open **Settings** → **Accounts** → **Sign-in options**',
    bioWindowsFallbackStep2: 'Under **PIN (Windows Hello)**, click **Set up**',
    bioDesktopBiometricTitle: 'Enable system biometrics',
    bioDesktopBiometricStep1: 'Open your system **Settings / Preferences**',
    bioDesktopBiometricStep2: 'Find **Security** or **Sign-in options**',
    bioDesktopBiometricStep3: 'Enable **fingerprint** or **face unlock**',
    bioDesktopBiometricStep4:
      'Return to this app and tap “Enabled — check again” below',
    bioDesktopFallbackTitle: 'Or: set a screen lock / login password',
    bioDesktopFallbackStep1:
      'In system settings, make sure a **login password** or **PIN** is set',
    cannotRestoreSeed:
      'Cannot restore wallet seed. Please create a new account.',
    createAccountFailed: 'Account creation failed: {message}',
    createAccountError:
      'An error occurred while creating the account: {message}',
    envCheckDetails: 'Environment check details:',
    httpsSecureContextLabel: 'HTTPS / secure context',
    webauthnApiLabel: 'WebAuthn API',
    platformAuthenticatorLabel: 'Platform authenticator (Touch ID / Face ID)',
    iosPasscodeFallbackLabel: '(iOS passcode fallback)',
    conditionalMediationLabel: 'Autofill support (optional)',
    walletTypeEoa: 'Wallet type: EOA',
    walletTypeSmartContract: 'Wallet type: Smart account',
    assets: 'Assets',
    balanceAllChainsUsd: 'All chains balance',
    balanceCurrentChainUsd: 'Current chain balance',
    importToken: 'Import',
    importing: 'Importing...',
    noTokensFound: 'No tokens found',
    tokenColumnName: 'Name',
    tokenColumnAmountValue: 'Amount/Value',
    tokenColumnPrice: 'Price',
    tokenColumnChangeRate: 'ChangeRate',
    tokenDetailBack: 'Back',
    tokenDetailHoldingsUsd: 'Holdings (USD)',
    tokenDetailDetails: 'Details',
    tokenDetailNetwork: 'Network',
    tokenDetailContract: 'Contract',
    tokenDetailNativeToken: 'Native token',
    tokenDetailDecimals: 'Decimals',
    tokenDetailAllowance: 'Approved amount',
    tokenDetailActivity: 'Activity',
    tokenDetailAllowanceEditHint:
      'Allowance editing is not available in the wallet yet.',
    noTransactions: 'No transactions yet',
    tokensTab: 'Assets',
    activityTab: 'Activity',
    moreTab: 'More',
    dappsTab: 'DApps',
    all: 'All',
    searchDappPlaceholder: 'Search DApp...',
    noDapps: 'No DApps',
    loading: 'Loading...',
    loadingDapps: 'Loading DApps...',
    loadingFailed: 'Loading failed: {error}',
    retry: 'Retry',
    refresh: 'Refresh',
    disconnect: 'Disconnect',
    chain: 'Chain',
    receive: 'Receive',
    send: 'Send',
    swapOpenTitle: 'Open Ring swap',
    swapDisabledNonEvm:
      'Swap is available on Ethereum-compatible networks only',
    walletActionRingSwap: 'RingSwap',
    walletActionBuy: 'Buy',
    amount: 'Amount',
    address: 'Address',
    memo: 'Memo',
    max: 'Max',
    confirm: 'Confirm',
    cancel: 'Cancel',
    confirmSend: 'Confirm send',
    invalidAddress: 'Invalid address',
    invalidAmount: 'Invalid amount',
    insufficientBalance: 'Insufficient balance',
    txSent: 'Transaction sent',
    txFailed: 'Transaction failed: {message}',
    txCanceledBiometricFailed:
      'Biometric verification failed. Transaction canceled.',
    copySignature: 'Copy signature',
    importTokenTitle: 'Import token',
    tokenAddress: 'Token address',
    tokenSymbol: 'Symbol',
    tokenName: 'Name',
    tokenDecimals: 'Decimals',
    tokenAddressRequired: 'Please enter a token contract address.',
    invalidAddressFormat: 'Invalid address format.',
    rpcNotConfigured: 'RPC is not configured.',
    tokenInfoFetchFailed:
      'Failed to fetch token info. Please verify the address.',
    add: 'Add',
    admin: 'Admin',
    adminLogin: 'Admin login',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign in',
    signOut: 'Sign out',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    addDapp: 'Add DApp',
    noDappsAdmin: 'No DApps yet. Click “Add DApp” to create one.',
    connectRequestTitle: 'Connection request',
    connectRequestDesc: 'This DApp wants to connect to your wallet.',
    txConfirmTitle: 'Transaction confirmation',
    txConfirmDesc: 'Please confirm the transaction below.',
    signRequestTitle: 'Signature request',
    signRequestDesc: 'Please confirm signing the message below.',
    typedDataSignTitle: 'Typed data signature',
    typedDataSignDesc: 'Please confirm signing the structured data below.',
    switchNetworkTitle: 'Switch network',
    switchNetworkDesc: 'Request to switch to {chainName}',
    permViewAddress: 'View your wallet address',
    permViewBalance: 'View your account balance',
    permRequestApproval: 'Request transaction approvals',
    signSafetyWarning: 'Only sign on sites you trust.',
    typedSignSafetyWarning: 'Only sign structured data on sites you trust.',
    reject: 'Reject',
    connectAction: 'Connect',
    approveTransactionAction: 'Approve transaction',
    switchAction: 'Switch',
    signAction: 'Sign',
  },
  zh: {
    account: '账户',
    switchAccount: '切换地址',
    notifications: '通知设置',
    notificationsStatusEnabled: '已开启',
    notificationsStatusBlocked: '已阻止',
    notificationsStatusUnsupported: '不支持',
    notificationsStatusTapToEnable: '点按开启',
    notificationsEnabledMessage: '当前应用的通知已开启。',
    notificationsBlockedMessage:
      '通知已被阻止，请到浏览器或系统设置中重新开启。',
    notificationsUnsupportedMessage:
      '当前环境暂不支持通知。iPhone 上请先将 PWA 安装到主屏幕。',
    notificationsPermissionPendingMessage:
      '尚未授予通知权限，如需重试可再次点击。',
    feedback: '反馈',
    about: '关于',
    logout: '退出登录',
    wallet: '钱包',
    copy: '复制',
    copied: '已复制',
    copiedToClipboard: '已复制到剪贴板',
    close: '关闭',
    language: '语言',
    english: 'English',
    chinese: '中文',
    syncing: '同步中...',
    migrateFromAndroid: '从 Android 迁移',
    syncSuccessTitle: '账号同步成功',
    syncSuccessBody:
      '已在此设备上创建了包含相同钱包密钥的 Passkey。\n下次您可以直接在此设备上使用生物识别登录，无需扫码。',
    syncFailed: '同步失败',
    syncErrorPrefix: '同步错误: {message}',
    login: '登录',
    loggingIn: '登录中...',
    createAccount: '创建新账户',
    creating: '创建中...',
    noAccountFound: '未找到已有账户',
    loginTipNoPasskey: '提示：如果没有 Passkey，点击「创建账户」。',
    passkeyNeedsSecureContext: 'Passkey 需要在安全环境(HTTPS)下运行',
    passkeyApiUnavailable:
      '您的浏览器版本过低或不支持Passkey，请升级Chrome/Edge/Safari',
    biometricNotDetected: '仍未检测到设备验证，请确认已完成设置',
    biometricGuideTitle: '需要开启设备验证',
    biometricGuideDesc:
      '您的设备尚未开启生物识别或屏幕锁，无法使用 Passkey 登录。请按以下步骤开启：',
    biometricGuideRecommended: '推荐',
    biometricGuideToggleFallback: '设备不支持生物识别？查看替代方案 ›',
    biometricGuideFallbackHint:
      '即使没有指纹/面容，设置屏幕锁密码后也可以正常使用。',
    biometricGuideChecking: '检测中...',
    biometricGuideRetry: '我已开启，重新检测',
    biometricGuideRetryHint: '仍未检测到？请尝试重启浏览器后再试。',
    bioIosBiometricTitle: '开启面容 ID / 触控 ID',
    bioIosBiometricStep1: '打开 **设置**',
    bioIosBiometricStep2: '进入 **面容 ID 与密码**（或 **触控 ID 与密码**）',
    bioIosBiometricStep3: '输入锁屏密码',
    bioIosBiometricStep4: '开启 **面容 ID**（或添加 **指纹**）',
    bioIosBiometricStep5: '返回本应用，点击下方「我已开启，重新检测」',
    bioIosFallbackTitle: '或者：开启屏幕锁密码',
    bioIosFallbackStep1: '打开 **设置** → **面容 ID 与密码**',
    bioIosFallbackStep2: '点击 **开启密码**，设置一个数字密码即可',
    bioAndroidBiometricTitle: '开启指纹 / 面部识别',
    bioAndroidBiometricStep1: '打开 **设置**',
    bioAndroidBiometricStep2: '搜索 **生物识别** 或进入 **安全 → 生物识别**',
    bioAndroidBiometricStep3: '设置 **指纹** 或 **面部识别**',
    bioAndroidBiometricStep4: '按提示完成录入',
    bioAndroidBiometricStep5: '返回本应用，点击下方「我已开启，重新检测」',
    bioAndroidFallbackTitle: '或者：开启屏幕锁',
    bioAndroidFallbackStep1: '打开 **设置** → **安全** → **屏幕锁定**',
    bioAndroidFallbackStep2: '选择 **PIN** / **密码** / **图案** 并完成设置',
    bioMacosBiometricTitle: '开启触控 ID',
    bioMacosBiometricStep1: '打开 **系统设置**',
    bioMacosBiometricStep2: '进入 **触控 ID 与密码**',
    bioMacosBiometricStep3: '点击 **添加指纹** 并完成录入',
    bioMacosBiometricStep4: '返回本应用，点击下方「我已开启，重新检测」',
    bioMacosFallbackTitle: '或者：确保已设置登录密码',
    bioMacosFallbackStep1: '打开 **系统设置** → **用户与群组**',
    bioMacosFallbackStep2: '确保当前账户已设置 **登录密码**',
    bioWindowsBiometricTitle: '开启 Windows Hello',
    bioWindowsBiometricStep1: '打开 **设置**',
    bioWindowsBiometricStep2: '进入 **账户** → **登录选项**',
    bioWindowsBiometricStep3:
      '在 **Windows Hello** 下设置 **指纹** 或 **面部识别**',
    bioWindowsBiometricStep4: '按提示完成录入',
    bioWindowsBiometricStep5: '返回本应用，点击下方「我已开启，重新检测」',
    bioWindowsFallbackTitle: '或者：设置 PIN',
    bioWindowsFallbackStep1: '打开 **设置** → **账户** → **登录选项**',
    bioWindowsFallbackStep2: '在 **PIN (Windows Hello)** 下点击 **设置**',
    bioDesktopBiometricTitle: '开启系统生物识别',
    bioDesktopBiometricStep1: '打开系统 **设置 / 偏好设置**',
    bioDesktopBiometricStep2: '找到 **安全** 或 **登录选项**',
    bioDesktopBiometricStep3: '开启 **指纹** 或 **面部识别**',
    bioDesktopBiometricStep4: '返回本应用，点击下方「我已开启，重新检测」',
    bioDesktopFallbackTitle: '或者：设置屏幕锁 / 登录密码',
    bioDesktopFallbackStep1: '在系统设置中确保已设置 **登录密码** 或 **PIN**',
    cannotRestoreSeed: '无法恢复钱包种子，请重新创建账户',
    createAccountFailed: '创建账户失败: {message}',
    createAccountError: '创建账户过程中发生错误：{message}',
    envCheckDetails: '环境检测详情:',
    httpsSecureContextLabel: 'HTTPS/安全上下文',
    webauthnApiLabel: 'WebAuthn API',
    platformAuthenticatorLabel: '平台验证器(指纹/面容)',
    iosPasscodeFallbackLabel: '(iOS密码替代)',
    conditionalMediationLabel: '自动填充支持 (非必须)',
    walletTypeEoa: '钱包类型: EOA',
    walletTypeSmartContract: '钱包类型: 智能合约',
    assets: '资产',
    balanceAllChainsUsd: '全部链余额',
    balanceCurrentChainUsd: '当前链余额',
    importToken: '导入',
    importing: '导入中...',
    noTokensFound: '未找到资产',
    tokenColumnName: '名称',
    tokenColumnAmountValue: '数量/价值',
    tokenColumnPrice: '价格',
    tokenColumnChangeRate: '涨跌幅',
    tokenDetailBack: '返回',
    tokenDetailHoldingsUsd: '持仓（美元）',
    tokenDetailDetails: '详情',
    tokenDetailNetwork: '网络',
    tokenDetailContract: '合约',
    tokenDetailNativeToken: '主链代币',
    tokenDetailDecimals: '小数位',
    tokenDetailAllowance: '授权额度',
    tokenDetailActivity: '活动',
    tokenDetailAllowanceEditHint: '钱包暂不支持在此编辑授权额度。',
    noTransactions: '暂无交易记录',
    tokensTab: '资产',
    activityTab: '活动',
    moreTab: '更多',
    dappsTab: 'DApps',
    all: '全部',
    searchDappPlaceholder: '搜索 DApp...',
    noDapps: '暂无 DApp',
    loading: '加载中...',
    loadingDapps: 'DApp 加载中...',
    loadingFailed: '加载失败: {error}',
    retry: '重试',
    refresh: '刷新',
    disconnect: '断开',
    chain: '链',
    receive: '收款',
    send: '转账',
    swapOpenTitle: '打开 Ring 兑换',
    swapDisabledNonEvm: '请在以太坊兼容网络下使用兑换',
    walletActionRingSwap: '兑换',
    walletActionBuy: '购买',
    amount: '金额',
    address: '地址',
    memo: '备注',
    max: '最大',
    confirm: '确认',
    cancel: '取消',
    confirmSend: '确认转账',
    invalidAddress: '地址不合法',
    invalidAmount: '金额不合法',
    insufficientBalance: '余额不足',
    txSent: '交易已发送',
    txFailed: '交易失败: {message}',
    txCanceledBiometricFailed: '生物识别验证失败，交易已取消',
    copySignature: '复制签名',
    importTokenTitle: '导入代币',
    tokenAddress: '代币地址',
    tokenSymbol: '符号',
    tokenName: '名称',
    tokenDecimals: '小数位',
    tokenAddressRequired: '请输入代币合约地址',
    invalidAddressFormat: '无效的地址格式',
    rpcNotConfigured: 'RPC 未配置',
    tokenInfoFetchFailed: '无法获取代币信息，请检查地址是否有效',
    add: '添加',
    admin: '管理后台',
    adminLogin: '管理后台登录',
    username: '用户名',
    password: '密码',
    signIn: '登录',
    signOut: '退出',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    addDapp: '新增 DApp',
    noDappsAdmin: '暂无 DApp，点击「新增 DApp」添加',
    connectRequestTitle: '连接请求',
    connectRequestDesc: '该 DApp 请求连接你的钱包',
    txConfirmTitle: '交易确认',
    txConfirmDesc: '请确认以下交易',
    signRequestTitle: '签名请求',
    signRequestDesc: '请确认签名以下消息',
    typedDataSignTitle: '类型化数据签名',
    typedDataSignDesc: '请确认签名以下结构化数据',
    switchNetworkTitle: '切换网络',
    switchNetworkDesc: '请求切换到 {chainName}',
    permViewAddress: '查看你的钱包地址',
    permViewBalance: '查看你的账户余额',
    permRequestApproval: '请求交易审批',
    signSafetyWarning: '请仅在你信任的网站签名',
    typedSignSafetyWarning: '请仅在你信任的网站签名结构化数据',
    reject: '拒绝',
    connectAction: '连接',
    approveTransactionAction: '确认交易',
    switchAction: '切换',
    signAction: '签名',
  },
} as const

export type MessageKey = keyof typeof messages.en

function formatMessage(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k]
    return v === undefined ? `{${k}}` : String(v)
  })
}

function isLang(v: string | null | undefined): v is Lang {
  return v === 'en' || v === 'zh'
}

export function getPreferredLang(): Lang {
  const stored = safeGetItem(STORAGE_KEY)
  if (isLang(stored)) return stored
  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'en'
}

export function tGlobal(key: MessageKey, vars?: Vars): string {
  const lang = getPreferredLang()
  const template = messages[lang][key] ?? messages.en[key] ?? key
  return formatMessage(template, vars)
}

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nValue | undefined>(undefined)

export function I18nProvider({
  children,
  defaultLang = 'en',
}: {
  children: React.ReactNode
  defaultLang?: Lang
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang)

  useEffect(() => {
    const explicit = safeGetItem(EXPLICIT_STORAGE_KEY)
    const stored = safeGetItem(STORAGE_KEY)
    if (explicit === 'true' && isLang(stored)) {
      setLangState(stored)
    }
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    safeSetItem(STORAGE_KEY, next)
    safeSetItem(EXPLICIT_STORAGE_KEY, 'true')
  }, [])

  const dict = messages[lang]

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const template = dict[key] ?? messages.en[key] ?? key
      return formatMessage(template, vars)
    },
    [dict]
  )

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
