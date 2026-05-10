import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/i18n', () => ({
  tGlobal: vi.fn((key: string) => key),
}))

type DomEventHandler = (evt: Event) => void
const windowListeners = new Map<string, DomEventHandler>()
vi.stubGlobal('window', {
  addEventListener: vi.fn((event: string, handler: DomEventHandler) => {
    windowListeners.set(event, handler)
  }),
  removeEventListener: vi.fn((event: string) => {
    windowListeners.delete(event)
  }),
})

import { WalletBridge } from '@/features/dapps/services/walletBridge'

function makeMockConfig() {
  return {
    getActiveAddress: vi.fn(() => '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
    getActiveChainId: vi.fn(() => 1),
    getActiveChainRpcUrl: vi.fn(() => 'https://rpc.example.test'),
    getActivePrivateKey: vi.fn(
      () => '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    ),
    getChains: vi.fn(() => [
      { id: 1, name: 'Ethereum', rpcUrl: ['https://rpc.example.test'] },
      { id: 11155111, name: 'Sepolia', rpcUrl: ['https://sepolia.rpc'] },
    ]),
    switchChain: vi.fn(),
  }
}

describe('WalletBridge — construction and lifecycle', () => {
  it('creates without errors', () => {
    const bridge = new WalletBridge(makeMockConfig())
    expect(bridge).toBeDefined()
  })

  it('detach clears internal state', () => {
    const bridge = new WalletBridge(makeMockConfig())
    bridge.detach()
    expect(bridge).toBeDefined()
  })
})

describe('WalletBridge — sendEvent / notify helpers', () => {
  let bridge: WalletBridge
  let config: ReturnType<typeof makeMockConfig>
  let postMessageSpy: ReturnType<typeof vi.fn>
  let mockIframe: { contentWindow: { postMessage: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    config = makeMockConfig()
    bridge = new WalletBridge(config)
    postMessageSpy = vi.fn()
    mockIframe = {
      contentWindow: { postMessage: postMessageSpy },
    }

    bridge.attach(
      mockIframe as unknown as HTMLIFrameElement,
      'TestDApp',
      'https://icon.png',
      'https://dapp.example'
    )
  })

  afterEach(() => {
    bridge.detach()
  })

  it('sendEvent posts ring_wallet_event message', () => {
    bridge.sendEvent('accountsChanged', ['0x123'])
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'ring_wallet_event',
        event: 'accountsChanged',
        data: ['0x123'],
      },
      '*'
    )
  })

  it('notifyChainChanged sends chainChanged event', () => {
    bridge.notifyChainChanged('0x1')
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ring_wallet_event',
        event: 'chainChanged',
        data: '0x1',
      }),
      '*'
    )
  })

  it('notifyAccountsChanged sends accountsChanged event', () => {
    bridge.notifyAccountsChanged(['0xnew'])
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ring_wallet_event',
        event: 'accountsChanged',
        data: ['0xnew'],
      }),
      '*'
    )
  })

  it('notifyDisconnect sends disconnect event with code 4900', () => {
    bridge.notifyDisconnect()
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ring_wallet_event',
        event: 'disconnect',
        data: { code: 4900, message: 'Disconnected' },
      }),
      '*'
    )
  })
})
