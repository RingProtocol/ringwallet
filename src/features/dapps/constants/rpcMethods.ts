export const READ_ONLY_METHODS = new Set([
  'eth_call',
  'eth_estimateGas',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_getTransactionCount',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getLogs',
  'eth_gasPrice',
  'eth_blockNumber',
  'eth_feeHistory',
  'eth_maxPriorityFeePerGas',
  'eth_getBlockTransactionCountByNumber',
  'eth_getBlockTransactionCountByHash',
  'net_version',
  'web3_clientVersion',
  'wallet_getPermissions',
])

export const APPROVAL_METHODS = new Set([
  'eth_requestAccounts',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_requestPermissions',
])

export const LOCAL_METHODS = new Set([
  'eth_accounts',
  'eth_chainId',
])

export const RPC_ERRORS = {
  USER_REJECTED: { code: 4001, message: 'User rejected the request' },
  UNAUTHORIZED: { code: 4100, message: 'The requested method/account is not authorized' },
  UNSUPPORTED_METHOD: { code: 4200, message: 'The provider does not support the requested method' },
  DISCONNECTED: { code: 4900, message: 'The provider is disconnected from all chains' },
  CHAIN_DISCONNECTED: { code: 4901, message: 'The provider is disconnected from the specified chain' },
  CHAIN_NOT_ADDED: { code: 4902, message: 'Unrecognized chain ID' },
} as const
