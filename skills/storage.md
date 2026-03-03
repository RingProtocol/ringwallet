# Token storage utility (under utils/)

Add a storage utility for imported ERC20 tokens. Persist to localStorage.

## Storage key format
`imported_tokens_${chainId}_${walletAddress}` — per-wallet, per-chain.

## Token info shape
```ts
interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
}
```

## API

### addToken(walletAddress, chainId, tokenInfo: TokenInfo)
- Called when user imports a token.
- Deduplicate: skip if same contract address already exists (case-insensitive).
- Persist to localStorage.

### getTokenList(walletAddress, chainId): TokenInfo[]
- Returns imported tokens for this wallet on this chain.
- Used by: token balance display, Send flow (select native vs ERC20).

### removeToken(walletAddress, chainId, tokenAddress)
- Removes a token from the imported list.

## Future use cases
1. **Send flow**: Choose native ETH or imported ERC20.
2. **Token balance UI**: Load and display token list.
