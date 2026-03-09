export type ApprovalType = 'connect' | 'transaction' | 'sign' | 'sign_typed' | 'switch_chain'

export interface ApprovalRequest {
  id: string
  type: ApprovalType
  title: string
  description: string
  dappName: string
  dappIcon: string
  dappUrl: string
  data?: unknown
  resolve: (approved: boolean) => void
}

export interface TransactionData {
  from: string
  to: string
  value: string
  data: string
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

export interface SignData {
  message: string
  address: string
}

export interface SignTypedData {
  address: string
  typedData: Record<string, unknown>
}

export interface SwitchChainData {
  chainId: string
}
