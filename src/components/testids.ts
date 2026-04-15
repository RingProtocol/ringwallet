export const TESTID = {
  // Login
  LOGIN_BUTTON: 'login-button',
  CREATE_ACCOUNT_BUTTON: 'create-account-button',

  // Balance
  BALANCE_AMOUNT: 'balance-amount',
  /** Native token quantity on the assets list (not USD hero). */
  TOKEN_NATIVE_BALANCE: 'token-native-balance',
  WALLET_ADDRESS: 'wallet-address',

  // Chain switcher
  CHAIN_SWITCHER_TRIGGER: 'chain-switcher-trigger',
  CHAIN_SEARCH_INPUT: 'chain-search-input',
  CHAIN_OPTION: 'chain-option',
  CHAIN_TAB_TESTNET: 'chain-tab-testnet',

  // Transaction actions
  SEND_BUTTON: 'send-button',
  RECEIVE_BUTTON: 'receive-button',
  SWAP_BUTTON: 'swap-button',
  BUY_BUTTON: 'buy-button',

  // Send form fields
  SEND_TO_INPUT: 'send-to-input',
  SEND_AMOUNT_INPUT: 'send-amount-input',
  SEND_TOKEN_SELECT: 'send-token-select',

  // Send form actions
  SEND_SIGN_BUTTON: 'send-sign-button',
  SEND_BROADCAST_BUTTON: 'send-broadcast-button',
  SEND_CLOSE_BUTTON: 'send-close-button',
  BROADCAST_HASH: 'broadcast-hash',
  BROADCAST_SUCCESS: 'broadcast-success',

  // Bottom nav (main wallet shell)
  TAB_WALLET: 'tab-wallet',
  TAB_ACTIVITY: 'tab-activity',
  TAB_MORE: 'tab-more',
  /** @deprecated Use TAB_WALLET; kept for older tests */
  TAB_ASSETS: 'tab-assets',
  TAB_DAPPS: 'tab-dapps',

  // Activity / TransactionHistory
  TX_ROW: 'tx-row',
  TX_HISTORY: 'tx-history',
  TX_LOADING: 'tx-loading',
  TX_EMPTY: 'tx-empty',
} as const
