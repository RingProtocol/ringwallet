import { useAuth } from '@clerk/nextjs'
import { User } from '@shared/db/schema'
import { useMutation, useQuery } from '@tanstack/react-query'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { Bell, Coins, Home, Copy, ChevronDown } from 'lucide-react'
import {
  Page,
  Navbar,
  Block,
  Button,
  BlockTitle,
  Preloader,
  TabbarLink,
  Icon,
  Tabbar,
  DialogButton,
  Dialog,
} from 'konsta/react'
import { MouseEventHandler, use, useEffect, useMemo, useState } from 'react'
import { attestUserAndCreateSubOrg } from '@shared/turnkey'
import { createAccount } from '@turnkey/viem'
import { createWalletClient, http, parseEther } from 'viem'
import { sepolia, mainnet } from 'viem/chains'
import { WebauthnStamper } from '@turnkey/webauthn-stamper'
import { TurnkeyClient } from '@turnkey/http'
import axios from 'axios'
import { useBalance } from 'wagmi'
import { base64ToUint8Array, truncateEthAddress } from '@shared/client-utils'
import { useInstallWebhookAndOfferUserUpgradeIfAvailable } from '../hooks/useInstallWebhookAndPromptUserUpgradeIfAvailable'
import { useDetectRuntimeEnvironment } from '../hooks/useDetectRuntimeEnvironment'
import { useReadLocalStorage, useSaveLocalStorage } from '../utils'

type subOrgFormData = {
  subOrgName: string
}

type privateKeyFormData = {
  privateKeyName: string
}

type signingFormData = {
  messageToSign: string
}

const stamper = new WebauthnStamper({
  rpId: global.location?.hostname,
})

const passkeyHttpClient = new TurnkeyClient(
  {
    baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
  },
  stamper,
) as any

type typeOfChain = 'ethereum' | 'solana' | 'bitcoin' | 'sepolia'

export default function Index() {
  const isSWInstalled = useInstallWebhookAndOfferUserUpgradeIfAvailable()
  const web2Auth = useAuth()

  const userDataQuery = useQuery({
    queryKey: ['whoami', web2Auth.userId],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      const json = await res.json()
      return json
    },
  })

  const handleSignoutClick = async () => {
    await web2Auth.signOut()
  }

  const user: User | undefined = userDataQuery.data?.user
  const isRegistered = user?.internal_id ? true : false

  const hasRegisteredWallet = !!user?.turnkey_suborg

  const walletAddress = user?.turnkey_private_key_public_address as
    | `0x${string}`
    | undefined

  // 链切换相关状态
  const [selectedChain, setSelectedChain] = useState<typeOfChain>('ethereum')
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false)

  // 转账相关状态
  const [recipientAddress, setRecipientAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')

  const chainConfigs = {
    ethereum: {
      name: '以太坊',
      symbol: 'ETH',
      viemChain: mainnet,
      color: '#627EEA',
      id: 1,
    },
    sepolia: {
      name: 'Sepolia 测试网',
      symbol: 'ETH',
      viemChain: sepolia,
      color: '#627EEA',
      id: 11155111
    },
    solana: {
      name: 'Solana',
      symbol: 'SOL',
      viemChain: null, // Solana 不使用 viem
      color: '#9945FF',
      id: 507
    },
    bitcoin: {
      name: 'Bitcoin',
      symbol: 'BTC',
      viemChain: null, // Bitcoin 不使用 viem
      color: '#F7931A',
      id: 0
    }
  }

  // 使用 selectedChain 作为依赖，当链切换时重新查询余额
  console.log('selectedChain=', selectedChain);
  console.log('walletAddress=', walletAddress);
  console.log('chainConfigs[selectedChain].viemChain?.id,= ', chainConfigs[selectedChain].viemChain?.id)

  const ethBalanceQuery = useBalance({
    address: walletAddress,
    chainId: chainConfigs[selectedChain].viemChain?.id,
    onError: () => {
      console.log('ethBalanceQuery error')
    },
    onSuccess: () => {
      console.log('ethBalanceQuery success')
    },
    watch: true,
    // refetchInterval: 10000
  })

  console.log('ethBalanceQuery.data=', ethBalanceQuery.data);

  const isLoadingDataToDeriveUi =
    userDataQuery.isLoading || web2Auth.isLoaded === false

  const envMode = useDetectRuntimeEnvironment()

  let onboardingStatus:
    | 'loading'
    | 'not-mobile'
    | 'mobile-not-pwa'
    | 'pwa-not-logged-in'
    | 'pwa-logged-in-no-wallet'
    | 'pwa-logged-in-has-wallet' = 'loading'
  if (isLoadingDataToDeriveUi) {
    onboardingStatus = 'loading'
  } else if (envMode === 'not-mobile') {
    onboardingStatus = 'not-mobile'
  } else if (envMode === 'mobile-not-installed') {
    onboardingStatus = 'mobile-not-pwa'
  } else if (envMode === 'pwa' && isRegistered === false) {
    onboardingStatus = 'pwa-not-logged-in'
  } else if (
    envMode === 'pwa' &&
    isRegistered === true &&
    hasRegisteredWallet === false
  ) {
    onboardingStatus = 'pwa-logged-in-no-wallet'
  } else if (
    envMode === 'pwa' &&
    isRegistered === true &&
    hasRegisteredWallet === true
  ) {
    onboardingStatus = 'pwa-logged-in-has-wallet'
  }

  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'airdrop'>(
    'home',
  )
  const isTabbarIcons = true
  const isTabbarLabels = false

  // 从本地存储读取保存的链ID并在组件挂载时设置
  const saved_chain_id = useReadLocalStorage('selectedChain')

  useEffect(() => {
    if (saved_chain_id && typeof saved_chain_id === 'string' && Object.keys(chainConfigs).includes(saved_chain_id)) {
      setSelectedChain(saved_chain_id as typeOfChain)
    }
  }, [saved_chain_id]);

  // 当选择的链改变时，重新查询余额
  useEffect(() => {
    if (walletAddress && ethBalanceQuery.refetch) {
      console.log('balance query refetch')
      ethBalanceQuery.refetch()
    }
  }, [selectedChain, walletAddress, ethBalanceQuery]);

  const currentChainConfig = chainConfigs[selectedChain]

  const createSubOrgMutation = useMutation({
    mutationFn: async () => {
      const subOrgId = await attestUserAndCreateSubOrg({
        passKeyIdName: 'Anagram PWA Demo 4',
        subOrgName: 'Anagram PWA Demo 4',
      })
      await userDataQuery.refetch()
      return subOrgId
    },
  })

  const handleCreateSubOrgClick = async () => {
    if (!navigator.credentials) {
      alert('Wallet creation requires WebAuthn support. Please use a secure connection (HTTPS) or a supported browser.');
      return;
    }
    const subOrgId = await createSubOrgMutation.mutateAsync()
  }

  const signMessage = async (
    data: signingFormData,
    subOrgId: string,
    privateKeyId: string,
    privateKeyPublicAddress: string,
    chainConfig: typeof currentChainConfig,
  ) => {
    if (!subOrgId || !privateKeyId || !privateKeyPublicAddress) {
      throw new Error('sub-org id or private key not found')
    }
    const viemAccount = await createAccount({
      client: passkeyHttpClient,
      organizationId: subOrgId,
      privateKeyId: privateKeyId,
      ethereumAddress: privateKeyPublicAddress,
    })

    // 只有以太坊兼容链才能使用 viem 签名
    if (!chainConfig.viemChain) {
      throw new Error(`${chainConfig.name} 暂不支持消息签名`)
    }

    const viemClient = createWalletClient({
      account: viemAccount,
      chain: chainConfig.viemChain,
      transport: http(),
    })

    const signedMessage = await viemClient.signMessage({
      account: viemAccount,
      message: data.messageToSign,
    })

    return {
      message: data.messageToSign,
      signature: signedMessage,
    }
  }

  // 转账函数
  const sendTransaction = async (
    recipientAddress: string,
    amount: string,
    subOrgId: string,
    privateKeyId: string,
    privateKeyPublicAddress: string,
    chainConfig: typeof currentChainConfig,
  ) => {
    if (!subOrgId || !privateKeyId || !privateKeyPublicAddress) {
      throw new Error('sub-org id or private key not found')
    }

    if (!chainConfig.viemChain) {
      throw new Error(`${chainConfig.name} 暂不支持转账`)
    }

    const viemAccount = await createAccount({
      client: passkeyHttpClient,
      organizationId: subOrgId,
      privateKeyId: privateKeyId,
      ethereumAddress: privateKeyPublicAddress,
    })

    const viemClient = createWalletClient({
      account: viemAccount,
      chain: chainConfig.viemChain,
      transport: http(),
    })

    const hash = await viemClient.sendTransaction({
      account: viemAccount,
      to: recipientAddress as `0x${string}`,
      value: parseEther(amount),
    })

    return hash
  }

  const sendTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!recipientAddress || !sendAmount) {
        throw new Error('请填写收款地址和发送数量')
      }

      const hash = await sendTransaction(
        recipientAddress,
        sendAmount,
        user?.turnkey_suborg!,
        user?.turnkey_private_key_id!,
        user?.turnkey_private_key_public_address!,
        currentChainConfig,
      )

      // 转账成功后刷新余额
      await ethBalanceQuery.refetch()

      return hash
    },
  })

  const handleSendTransaction = async () => {
    try {
      const hash = await sendTransactionMutation.mutateAsync()
      alert(`转账成功！交易哈希: ${hash}`)
      // 清空输入框
      setRecipientAddress('')
      setSendAmount('')
    } catch (error) {
      alert(`转账失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleSignMessageClick = async () => {
    const res = await signMessage(
      { messageToSign: 'Hello from PWA' },
      user?.turnkey_suborg!,
      user?.turnkey_private_key_id!,
      user?.turnkey_private_key_public_address!,
      currentChainConfig,
    )

    setTimeout(() => {
      alert(`${res.message} - ${res.signature}`)
    })
  }

  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null)
  const [swSubscription, setSwSubscription] = useState<PushSubscription | null>(
    null,
  )
  const [promptInstall, setPrompFn] = useState<{ prompt: () => void } | null>()
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (event: any) => {
      event.preventDefault()
      if ('prompt' in event) {
        console.log('reg2', event)
        setPrompFn(event)
      }
    })
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      // run only in browser
      navigator.serviceWorker.ready.then((reg) => {
        console.log('reg1', reg, reg.pushManager)
        reg?.pushManager?.getSubscription().then((sub) => {
          if (
            sub &&
            !(
              sub.expirationTime &&
              Date.now() > sub.expirationTime - 5 * 60 * 1000
            )
          ) {
            setSwSubscription(sub)
          }
        })
        setSwRegistration(reg)
      })
    }
  }, [isSWInstalled])

  const [alertEnabledNotifsOpen, setAlertEnabledNotifsOpen] = useState(false)

  const handleClickEnableNotifications: MouseEventHandler<
    HTMLButtonElement
  > = async (event) => {
    if (!process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY) {
      throw new Error('Environment variables supplied not sufficient.')
    }
    if (!swRegistration) {
      console.error('No SW registration available.')
      return
    }
    event.preventDefault()
    const sub = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(
        process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
      ),
    })
    await axios.post(
      '/api/push-notifications/save-subscription',
      {
        subscription: sub,
        subscriptionSerialized: JSON.stringify(sub),
      },
      { withCredentials: true },
    )
    await userDataQuery.refetch()
    setAlertEnabledNotifsOpen(true)
  }

  const handleClickDisableNotifications: MouseEventHandler<
    HTMLButtonElement
  > = async (event) => {
    // TODO
    // if (!process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY) {
    //   throw new Error('Environment variables supplied not sufficient.')
    // }
    // if (!swRegistration) {
    //   console.error('No SW registration available.')
    //   return
    // }
    // event.preventDefault()
    // const unsubscribed = await swSubscription?.unsubscribe()
    // await axios.post(
    //   '/api/auth/remove-subscription',
    //   {
    //     subscriptionEndpoint: swSubscription?.endpoint,
    //   },
    //   { withCredentials: true },
    // )
    // await meQuery.refetch()
  }

  return (
    <>
      <Head>
        <title>Ring Wallet | Welcome</title>
      </Head>
      {onboardingStatus === 'loading' && (
        <Page
          colors={{
            bgIos: '#FEFEFE',
          }}
          className="flex flex-1 flex-col items-center justify-center"
        >
          <Preloader />
        </Page>
      )}
      {/* Mobile but not PWA - Come back on mobile */}
      {onboardingStatus === 'mobile-not-pwa' && (
        <Page
          colors={{
            bgIos: '#FEFEFE',
          }}
          className="flex flex-1 flex-col items-center justify-center"
        >
          <div>
            Looks like you haven't installed the App.
            {promptInstall && (
              <button onClick={() => promptInstall.prompt()}>Install</button>
            )}
            {!promptInstall && <div>Please install the PWA</div>}
          </div>
        </Page>
      )}

      {/* User needs to register/login */}
      {onboardingStatus === 'pwa-not-logged-in' && (
        <Page
          colors={{
            bgIos: '#FEFEFE',
          }}
        >
          <div className="flex flex-col flex-1 h-full justify-between">
            {/* Top of page */}
            <div className="p-8 pt-32 space-y-4">
              <div className="flex items-center justify-center">
                <Image
                  alt={''}
                  src={'/images/wallet-icon-2.png'}
                  width={164}
                  height={164}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex justify-center items-center">
                  PWA with wallet
                </h1>
              </div>
            </div>
            {/* Bottom of page */}
            <div className="p-8 pb-16 flex flex-col justify-end space-y-2">
              <Link href={'/sign-in'}>
                <Button rounded large>
                  Sign In
                </Button>
              </Link>
              {isRegistered && (
                <Button outline onClick={handleSignoutClick} rounded large>
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </Page>
      )}
      {/* User logged in but needs to create wallet */}
      {onboardingStatus === 'pwa-logged-in-no-wallet' && (
        <Page
          colors={{
            bgIos: '#FEFEFE',
          }}
        >
          <div className="flex flex-col flex-1 h-full justify-between">
            {/* TOP */}
            <div className="p-8 pt-32 space-y-4">
              <div className="flex items-center justify-center">
                <Image
                  alt={''}
                  src={'/images/wallet-icon-2.png'}
                  width={164}
                  height={164}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex justify-center items-center">
                  Create a wallet
                </h1>
              </div>
            </div>
            {/* Bottom */}
            <div className="p-8 pb-16 flex flex-col justify-end space-y-4">
              <Button
                disabled={createSubOrgMutation.isLoading}
                onClick={handleCreateSubOrgClick}
                rounded
                large
              >
                {createSubOrgMutation.isLoading ? 'Creating' : 'Create'} wallet
              </Button>
              {
                <Button clear large rounded onClick={handleSignoutClick}>
                  Sign Out
                </Button>
              }
            </div>
          </div>
        </Page>
      )}

      {/* User is logged in and has wallet -- happy path, now user can start using application */}
      {onboardingStatus === 'pwa-logged-in-has-wallet' && (
        <Page
          colors={{
            bgIos: '#FEFEFE',
          }}
        >
          <Navbar
            title="Home"
            subtitle="Wallet ready to use"
            className="top-0 sticky"
            large
            transparent={true}
          />
          <Tabbar
            labels={isTabbarLabels}
            icons={isTabbarIcons}
            className="left-0 bottom-0 fixed"
          >
            <TabbarLink
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
              icon={
                isTabbarIcons && <Icon ios={<Home className="w-7 h-7" />} />
              }
              label={isTabbarLabels && 'Home'}
            />
            <TabbarLink
              active={activeTab === 'feed'}
              onClick={() => setActiveTab('feed')}
              icon={
                isTabbarIcons && <Icon ios={<Bell className="w-7 h-7" />} />
              }
              label={isTabbarLabels && 'Feed'}
            />
            <TabbarLink
              active={activeTab === 'airdrop'}
              onClick={() => setActiveTab('airdrop')}
              icon={
                isTabbarIcons && <Icon ios={<Coins className="w-7 h-7" />} />
              }
              label={isTabbarLabels && 'Airdrop'}
            />
          </Tabbar>
          {activeTab === 'home' && (
            <>
              <BlockTitle className="flex items-center justify-between">
                <span>{truncateEthAddress(walletAddress ?? undefined)}</span>
                <Button
                  clear
                  small
                  onClick={() => {
                    if (walletAddress) {
                      navigator.clipboard.writeText(walletAddress)
                      alert('地址已复制到剪贴板')
                    }
                  }}
                  className="ml-2"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </BlockTitle>
              {/* 链选择器 */}
              <Block strong inset>
                <Button
                  onClick={() => setChainSelectorOpen(true)}
                  className="flex items-center justify-between w-full"
                  style={{ backgroundColor: currentChainConfig.color, color: 'white' }}
                >
                  <span>{currentChainConfig.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </Block>

              <Dialog
                opened={chainSelectorOpen}
                onBackdropClick={() => setChainSelectorOpen(false)}
                title="选择区块链网络"
                content="请选择要使用的区块链网络"
                buttons={
                  <>
                    {Object.entries(chainConfigs).map(([key, config]) => (
                      <DialogButton
                        key={key}
                        onClick={() => {
                          setSelectedChain(key as typeOfChain)
                          setChainSelectorOpen(false)
                          localStorage.setItem('selectedChain', key)
                          console.log('set to key=', key, 'value=', config);
                        }}
                        style={{
                          backgroundColor: selectedChain === key ? config.color : undefined,
                          color: selectedChain === key ? 'white' : undefined
                        }}
                      >
                        {config.name} ({config.symbol})
                      </DialogButton>
                    ))}
                    <DialogButton onClick={() => setChainSelectorOpen(false)}>
                      取消
                    </DialogButton>
                  </>
                }
              />
              <Block>
                <p>余额: {ethBalanceQuery.data?.formatted || '0'} {currentChainConfig.symbol}</p>
                <p className="text-sm text-gray-500 mt-1">
                  当前网络: {currentChainConfig.name}
                </p>
              </Block>
              <Block strong inset className="space-y-4">
                {!user?.web_push_subscription && (
                  <Button
                    onClick={handleClickEnableNotifications}
                    rounded
                    large
                  >
                    Enable notifications
                  </Button>
                )}
                {!!user?.web_push_subscription && (
                  <Button
                    disabled
                    onClick={handleClickEnableNotifications}
                    rounded
                    large
                  >
                    Notifications enabled
                  </Button>
                )}
                <Dialog
                  opened={alertEnabledNotifsOpen}
                  onBackdropClick={() => setAlertEnabledNotifsOpen(false)}
                  title="Noticiations enabled"
                  content="Notifications are now enabled!"
                  buttons={
                    <DialogButton
                      onClick={() => setAlertEnabledNotifsOpen(false)}
                    >
                      Ok
                    </DialogButton>
                  }
                />

                {/* 转账表单 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      收款地址
                    </label>
                    <input
                      type="text"
                      placeholder="输入收款地址 (0x...)"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      发送数量 ({currentChainConfig.symbol})
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder={`输入 ${currentChainConfig.symbol} 数量`}
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button
                    onClick={handleSendTransaction}
                    rounded
                    small
                    disabled={sendTransactionMutation.isLoading || !recipientAddress || !sendAmount}
                  >
                    {sendTransactionMutation.isLoading ? '发送中...' : '发送'}
                  </Button>
                </div>
                <Button clear onClick={handleSignoutClick} rounded large>
                  Sign Out
                </Button>
                <p>
                  <b>Ring Wallet</b>
                </p>
                <p>
                  <span>
                    Ring wallet is a pwa wallet, it's tiny and convinient. Support all chains and all tokens.
                  </span>
                </p>
              </Block>
            </>
          )}
          {activeTab === 'feed' && (
            <Block strong inset className="space-y-4">
              <p>
                <b>Transaction History</b>
              </p>
              <p>
                <span>
                  Dicta beatae repudiandae ab pariatur mollitia praesentium fuga
                  ipsum adipisci, quia nam expedita, est dolore eveniet, dolorum
                  obcaecati? Veniam repellendus mollitia sapiente minus saepe
                  voluptatibus necessitatibus laboriosam incidunt nihil autem.
                </span>
              </p>
            </Block>
          )}
          {activeTab === 'airdrop' && (
            <Block strong inset className="space-y-4">
              <p>
                <b>Wallet Settings</b>
              </p>
              <p>
                <span>
                  Vero esse ab natus neque commodi aut quidem nobis. Unde, quam
                  asperiores. A labore quod commodi autem explicabo distinctio
                  saepe ex amet iste recusandae porro consectetur, sed dolorum
                  sapiente voluptatibus?
                </span>
                <span>
                  Commodi ipsum, voluptatem obcaecati voluptatibus illum hic
                  aliquam veritatis modi natus unde, assumenda expedita, esse
                  eum fugit? Saepe aliquam ipsam illum nihil facilis, laborum
                  quia, eius ea dolores molestias dicta.
                </span>
                <span>
                  Consequatur quam laudantium, magnam facere ducimus tempora
                  temporibus omnis cupiditate obcaecati tempore? Odit qui a,
                  voluptas eveniet similique, doloribus eum dolorum ad, enim ea
                  itaque voluptates porro minima. Omnis, magnam.
                </span>
                <span>
                  Debitis, delectus! Eligendi excepturi rem veritatis, ad
                  exercitationem tempore eveniet voluptates aut labore harum
                  dolorem nemo repellendus accusantium quibusdam neque? Itaque
                  iusto quisquam reprehenderit aperiam maiores dicta iure
                  necessitatibus est.
                </span>
              </p>
            </Block>
          )}
        </Page>
      )}
    </>
  )
}
