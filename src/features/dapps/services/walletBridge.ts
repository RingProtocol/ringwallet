import { ethers } from 'ethers'
import { READ_ONLY_METHODS, APPROVAL_METHODS, RPC_ERRORS } from '../constants/rpcMethods'
import type { WalletRequestMessage } from '../types/messages'
import type { ApprovalRequest, ApprovalType } from '../types/approval'
import { tGlobal } from '../../../i18n'

interface BridgeConfig {
  getActiveAddress: () => string | null
  getActiveChainId: () => number
  getActiveChainRpcUrl: () => string
  getActivePrivateKey: () => string | null
  getChains: () => Array<{ id: number; name: string; rpcUrl: string }>
  switchChain: (chainId: number) => void
}

type ApprovalHandler = (request: Omit<ApprovalRequest, 'resolve'>) => Promise<boolean>

export class WalletBridge {
  private iframe: HTMLIFrameElement | null = null
  private connectedAccounts: string[] = []
  private approvalHandler: ApprovalHandler | null = null
  private messageHandler: ((e: MessageEvent) => void) | null = null
  private dappName = ''
  private dappIcon = ''
  private dappUrl = ''

  constructor(private config: BridgeConfig) {}

  attach(iframe: HTMLIFrameElement, dappName: string, dappIcon: string, dappUrl: string): void {
    this.iframe = iframe
    this.dappName = dappName
    this.dappIcon = dappIcon
    this.dappUrl = dappUrl

    this.messageHandler = (e: MessageEvent) => this.handleMessage(e)
    window.addEventListener('message', this.messageHandler)
  }

  detach(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }
    this.iframe = null
    this.connectedAccounts = []
  }

  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!this.iframe || event.source !== this.iframe.contentWindow) return
    const data = event.data
    if (!data || typeof data !== 'object') return

    try {
      if (data.type === 'ring_wallet_handshake') {
        this.handleHandshake()
      } else if (data.type === 'ring_wallet_request') {
        await this.handleRequest(data as WalletRequestMessage)
      }
    } catch (err) {
      console.error('[WalletBridge] message error:', err)
    }
  }

  private handleHandshake(): void {
    const chainId = this.config.getActiveChainId()
    this.sendToIframe({
      type: 'ring_wallet_handshake_ack',
      chainId: '0x' + chainId.toString(16),
      accounts: this.connectedAccounts,
    })
  }

  private async handleRequest(msg: WalletRequestMessage): Promise<void> {
    const { id, method, params } = msg

    try {
      let result: unknown

      if (method === 'eth_accounts') {
        result = [...this.connectedAccounts]
      } else if (method === 'eth_chainId') {
        result = '0x' + this.config.getActiveChainId().toString(16)
      } else if (method === 'net_version') {
        result = String(this.config.getActiveChainId())
      } else if (READ_ONLY_METHODS.has(method)) {
        result = await this.forwardToRpc(method, params)
      } else if (APPROVAL_METHODS.has(method)) {
        result = await this.handleApprovalMethod(method, params)
      } else {
        try {
          result = await this.forwardToRpc(method, params)
        } catch {
          this.sendResponse(id, undefined, RPC_ERRORS.UNSUPPORTED_METHOD)
          return
        }
      }

      this.sendResponse(id, result)
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string }
      this.sendResponse(id, undefined, {
        code: error.code || -32603,
        message: error.message || 'Internal error',
      })
    }
  }

  private async forwardToRpc(method: string, params: unknown[]): Promise<unknown> {
    const rpcUrl = this.config.getActiveChainRpcUrl()
    if (!rpcUrl) throw { code: 4900, message: 'No RPC URL for active chain' }

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const json = await res.json()
    if (json.error) throw { code: json.error.code || -32603, message: json.error.message }
    return json.result
  }

  private async handleApprovalMethod(method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case 'eth_requestAccounts':
        return this.handleRequestAccounts()
      case 'eth_sendTransaction':
        return this.handleSendTransaction(params)
      case 'personal_sign':
        return this.handlePersonalSign(params)
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData':
        return this.handleSignTypedData(params)
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params)
      case 'wallet_addEthereumChain':
        return this.handleSwitchChain(params)
      default:
        throw RPC_ERRORS.UNSUPPORTED_METHOD
    }
  }

  private async requestApproval(type: ApprovalType, title: string, description: string, data?: unknown): Promise<boolean> {
    if (!this.approvalHandler) throw { code: 4100, message: 'No approval handler' }
    return this.approvalHandler({
      id: crypto.randomUUID(),
      type,
      title,
      description,
      dappName: this.dappName,
      dappIcon: this.dappIcon,
      dappUrl: this.dappUrl,
      data,
    })
  }

  private async handleRequestAccounts(): Promise<string[]> {
    if (this.connectedAccounts.length > 0) return this.connectedAccounts

    const approved = await this.requestApproval(
      'connect',
      tGlobal('connectRequestTitle'),
      tGlobal('connectRequestDesc'),
    )
    if (!approved) throw RPC_ERRORS.USER_REJECTED

    const address = this.config.getActiveAddress()
    if (!address) throw RPC_ERRORS.UNAUTHORIZED
    this.connectedAccounts = [address]

    this.sendEvent('connect', { chainId: '0x' + this.config.getActiveChainId().toString(16) })
    this.sendEvent('accountsChanged', this.connectedAccounts)
    return this.connectedAccounts
  }

  private async handleSendTransaction(params: unknown[]): Promise<string> {
    const tx = params[0] as Record<string, string>
    const approved = await this.requestApproval(
      'transaction',
      tGlobal('txConfirmTitle'),
      tGlobal('txConfirmDesc'),
      tx,
    )
    if (!approved) throw RPC_ERRORS.USER_REJECTED

    const privateKey = this.config.getActivePrivateKey()
    if (!privateKey) throw RPC_ERRORS.UNAUTHORIZED

    const rpcUrl = this.config.getActiveChainRpcUrl()
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const txReq: ethers.TransactionRequest = {
      to: tx.to,
      data: tx.data || '0x',
      value: tx.value ? BigInt(tx.value) : 0n,
    }
    if (tx.gas) txReq.gasLimit = BigInt(tx.gas)
    if (tx.gasPrice) txReq.gasPrice = BigInt(tx.gasPrice)
    if (tx.maxFeePerGas) txReq.maxFeePerGas = BigInt(tx.maxFeePerGas)
    if (tx.maxPriorityFeePerGas) txReq.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas)

    const response = await wallet.sendTransaction(txReq)
    return response.hash
  }

  private async handlePersonalSign(params: unknown[]): Promise<string> {
    const [message, address] = params as [string, string]
    const approved = await this.requestApproval(
      'sign',
      tGlobal('signRequestTitle'),
      tGlobal('signRequestDesc'),
      { message, address },
    )
    if (!approved) throw RPC_ERRORS.USER_REJECTED

    const privateKey = this.config.getActivePrivateKey()
    if (!privateKey) throw RPC_ERRORS.UNAUTHORIZED

    const wallet = new ethers.Wallet(privateKey)
    const msgBytes = ethers.isHexString(message) ? ethers.getBytes(message) : message
    return wallet.signMessage(typeof msgBytes === 'string' ? msgBytes : msgBytes)
  }

  private async handleSignTypedData(params: unknown[]): Promise<string> {
    const [address, typedDataRaw] = params as [string, string | Record<string, unknown>]
    const typedData = typeof typedDataRaw === 'string' ? JSON.parse(typedDataRaw) : typedDataRaw

    const approved = await this.requestApproval(
      'sign_typed',
      tGlobal('typedDataSignTitle'),
      tGlobal('typedDataSignDesc'),
      { address, typedData },
    )
    if (!approved) throw RPC_ERRORS.USER_REJECTED

    const privateKey = this.config.getActivePrivateKey()
    if (!privateKey) throw RPC_ERRORS.UNAUTHORIZED

    const wallet = new ethers.Wallet(privateKey)
    const { domain, types, message } = typedData as {
      domain: Record<string, unknown>
      types: Record<string, Array<{ name: string; type: string }>>
      message: Record<string, unknown>
      primaryType: string
    }
    const filteredTypes = { ...types }
    delete filteredTypes['EIP712Domain']
    return wallet.signTypedData(domain, filteredTypes, message)
  }

  private async handleSwitchChain(params: unknown[]): Promise<null> {
    const { chainId } = params[0] as { chainId: string }
    const numericChainId = parseInt(chainId, 16)

    const chains = this.config.getChains()
    const found = chains.find(c => c.id === numericChainId)
    if (!found) throw RPC_ERRORS.CHAIN_NOT_ADDED

    const approved = await this.requestApproval(
      'switch_chain',
      tGlobal('switchNetworkTitle'),
      tGlobal('switchNetworkDesc', { chainName: found.name }),
      { chainId, chainName: found.name },
    )
    if (!approved) throw RPC_ERRORS.USER_REJECTED

    this.config.switchChain(numericChainId)
    this.sendEvent('chainChanged', chainId)
    return null
  }

  private sendToIframe(data: object): void {
    this.iframe?.contentWindow?.postMessage(data, '*')
  }

  private sendResponse(id: number, result?: unknown, error?: { code: number; message: string }): void {
    this.sendToIframe({
      type: 'ring_wallet_response',
      id,
      ...(error ? { error } : { result }),
    })
  }

  sendEvent(event: string, data: unknown): void {
    this.sendToIframe({ type: 'ring_wallet_event', event, data })
  }

  notifyChainChanged(chainId: string): void {
    this.sendEvent('chainChanged', chainId)
  }

  notifyAccountsChanged(accounts: string[]): void {
    this.connectedAccounts = accounts
    this.sendEvent('accountsChanged', accounts)
  }

  notifyDisconnect(): void {
    this.connectedAccounts = []
    this.sendEvent('disconnect', { code: 4900, message: 'Disconnected' })
  }
}
