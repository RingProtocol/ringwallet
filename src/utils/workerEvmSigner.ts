/**
 * Minimal ethers v6 Signer implementation that delegates
 * transaction signing to the isolated Worker via signerBridge.
 *
 * This allows existing code that expects an `ethers.Signer`
 * (e.g., Polymarket, Earn SDK) to work without exposing
 * privateKey in the main thread.
 */

import {
  ethers,
  type TransactionRequest,
  type TransactionResponse,
} from 'ethers'
import { signerBridge } from '../services/account/signerBridge'

export class WorkerEvmSigner extends ethers.AbstractSigner {
  private readonly _address: string
  private readonly _index: number
  private readonly _chainId: number
  private readonly _rpcUrl: string

  constructor(
    address: string,
    index: number,
    chainId: number,
    rpcUrl: string,
    provider?: ethers.Provider
  ) {
    super(provider)
    this._address = address
    this._index = index
    this._chainId = chainId
    this._rpcUrl = rpcUrl
  }

  async getAddress(): Promise<string> {
    return this._address
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    void message
    throw new Error('WorkerEvmSigner.signMessage not implemented')
  }

  connect(provider: ethers.Provider | null): WorkerEvmSigner {
    return new WorkerEvmSigner(
      this._address,
      this._index,
      this._chainId,
      this._rpcUrl,
      provider ?? undefined
    )
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    const resolvedTo = tx.to ? await ethers.resolveAddress(tx.to) : ''
    const rawTx = await signerBridge.signEvm({
      index: this._index,
      to: resolvedTo,
      amount: tx.value ? ethers.formatEther(tx.value) : '0',
      chainId: this._chainId,
      rpcUrl: this._rpcUrl,
      data: tx.data as string | undefined,
      gasLimit: tx.gasLimit?.toString(),
    })
    return rawTx
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider) {
      throw new Error('WorkerEvmSigner requires a provider for sendTransaction')
    }
    const rawTx = await this.signTransaction(tx)
    return this.provider.broadcastTransaction(rawTx)
  }

  async signTypedData(
    _domain: ethers.TypedDataDomain,
    _types: Record<string, Array<ethers.TypedDataField>>,
    _value: Record<string, unknown>
  ): Promise<string> {
    void _domain
    void _types
    void _value
    throw new Error('WorkerEvmSigner.signTypedData not implemented')
  }
}
