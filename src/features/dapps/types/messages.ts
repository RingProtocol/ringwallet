export interface WalletHandshakeMessage {
  type: 'ring_wallet_handshake'
  version: string
}

export interface WalletRequestMessage {
  type: 'ring_wallet_request'
  id: number
  method: string
  params: unknown[]
}

export interface WalletResponseMessage {
  type: 'ring_wallet_response'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export interface WalletEventMessage {
  type: 'ring_wallet_event'
  event: 'chainChanged' | 'accountsChanged' | 'connect' | 'disconnect'
  data: unknown
}

export interface WalletHandshakeAck {
  type: 'ring_wallet_handshake_ack'
  chainId: string
  accounts: string[]
}

export type WalletMessage =
  | WalletHandshakeMessage
  | WalletRequestMessage
  | WalletResponseMessage
  | WalletEventMessage
  | WalletHandshakeAck
