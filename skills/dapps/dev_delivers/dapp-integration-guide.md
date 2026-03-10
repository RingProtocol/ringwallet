# Ring Wallet — DApp Integration Guide

> **Version:** 1.0.0
> **Last Updated:** March 2026

## Table of Contents

- [Introduction](#introduction)
- [How It Works](#how-it-works)
- [Integration Steps](#integration-steps)
- [Quick Start](#quick-start)
- [Using the Provider](#using-the-provider)
- [Supported RPC Methods](#supported-rpc-methods)
- [Event Handling](#event-handling)
- [Working with Popular Libraries](#working-with-popular-libraries)
- [Common Scenarios](#common-scenarios)
- [Error Handling](#error-handling)
- [Detecting Ring Wallet](#detecting-ring-wallet)
- [Security Considerations](#security-considerations)
- [FAQ](#faq)

---

## Introduction

Ring Wallet is a PWA-based Ethereum wallet that loads DApps inside an iframe container. To integrate with Ring Wallet, you need to include the **Ring Wallet DApp SDK** (`dappsdk.js`) in your page.

The SDK provides a fully [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) compliant Ethereum Provider and supports [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) multi-wallet discovery. If your DApp already uses standard libraries like wagmi, ethers.js, web3.js, or RainbowKit, the only thing you need to do is **add one `<script>` tag** — no other code changes required.

### What You Receive

| File | Description |
|---|---|
| `dappsdk.js` | The Ring Wallet DApp SDK script — include this in your page |
| This document | Integration guide and API reference |

---

## How It Works

```
┌───────────────────────────────────────────────┐
│            Ring Wallet (parent window)         │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │            <iframe sandbox>             │  │
│  │                                         │  │
│  │  ┌───────────────────────────────────┐  │  │
│  │  │  Your DApp  +  dappsdk.js         │  │  │
│  │  │                                   │  │  │
│  │  │  window.ethereum (EIP-1193)       │  │  │
│  │  │         │                         │  │  │
│  │  │         │  provider.request()     │  │  │
│  │  └─────────┼─────────────────────────┘  │  │
│  │            │ postMessage                │  │
│  └────────────┼────────────────────────────┘  │
│               ▼                               │
│  ┌────────────────────────────────────┐       │
│  │  Wallet Bridge                     │       │
│  │  ├─ read-only queries → RPC node   │       │
│  │  └─ sensitive ops → approval UI    │       │
│  │     (connect / sign / send tx)     │       │
│  └────────────────────────────────────┘       │
└───────────────────────────────────────────────┘
```

1. Ring Wallet loads your DApp inside an iframe.
2. The `dappsdk.js` script you included creates an EIP-1193 provider and sets `window.ethereum`.
3. It also announces Ring Wallet via EIP-6963, so modern wallet-connect libraries detect it automatically.
4. Every `provider.request()` call is sent to Ring Wallet's parent window via `postMessage`.
5. Ring Wallet handles read-only RPC calls directly and prompts the user for approval on sensitive operations (transactions, signatures, connections).

---

## Integration Steps

### Step 1: Add the SDK script to your HTML

Place the following `<script>` tag in your HTML `<head>`, **before** your application bundle:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Ring Wallet SDK — MUST be loaded before your app code -->
  <script src="/dappsdk.js"></script>

  <!-- Your app bundle loads after -->
  <script src="/your-app.js"></script>
</head>
<body>
  ...
</body>
</html>
```

> **Important:** The SDK must execute before your application initializes, so that `window.ethereum` is already available when your code runs.

### Step 2: Host `dappsdk.js`

Copy the provided `dappsdk.js` file into your project's static/public assets directory. For example:

| Framework | Typical location |
|---|---|
| Plain HTML | Same directory as your HTML, or any static path |
| React (Create React App) | `public/dappsdk.js` → `<script src="/dappsdk.js">` |
| Next.js | `public/dappsdk.js` → `<script src="/dappsdk.js">` |
| Vue (Vite) | `public/dappsdk.js` → `<script src="/dappsdk.js">` |

### Step 3: That's it

If your DApp already uses `window.ethereum` or EIP-6963 (via wagmi, ethers.js, web3.js, etc.), **no further code changes are needed**. Ring Wallet will appear as an available wallet.

### Framework-Specific Examples

#### Next.js (App Router)

In your root `layout.tsx`:

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script src="/dappsdk.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

#### Next.js (Pages Router)

In `pages/_document.tsx`:

```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script src="/dappsdk.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

#### React (Create React App)

Place `dappsdk.js` in the `public/` folder, then add to `public/index.html`:

```html
<head>
  <script src="%PUBLIC_URL%/dappsdk.js"></script>
</head>
```

#### Vue (Vite)

Place `dappsdk.js` in the `public/` folder, then add to `index.html`:

```html
<head>
  <script src="/dappsdk.js"></script>
</head>
```

---

## Quick Start

### If you already use wagmi, RainbowKit, or similar

After adding the SDK script tag, **nothing else to do**. Ring Wallet's provider is automatically detected via EIP-6963. Your existing connect flow will show "Ring Wallet" as an available wallet option.

### If you use ethers.js

```javascript
import { BrowserProvider } from 'ethers'

const provider = new BrowserProvider(window.ethereum)
const signer = await provider.getSigner()
const address = await signer.getAddress()
```

### If you use web3.js

```javascript
import Web3 from 'web3'

const web3 = new Web3(window.ethereum)
const accounts = await web3.eth.requestAccounts()
```

### If you use the provider directly

```javascript
const provider = window.ethereum

const accounts = await provider.request({
  method: 'eth_requestAccounts'
})
console.log('Connected:', accounts[0])
```

---

## Using the Provider

After the SDK loads, the provider is available through three access methods:

| Access Method | Description |
|---|---|
| `window.ethereum` | Standard provider object (set if not already occupied by another wallet) |
| `window.ringWallet.provider` | Always available, even if another wallet set `window.ethereum` first |
| EIP-6963 event discovery | Recommended for multi-wallet support |

### EIP-6963 Discovery (Recommended)

```javascript
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail

  if (info.rdns === 'org.testring.ringwallet') {
    console.log('Found Ring Wallet:', info.name)
    // Use this provider...
  }
})

// Trigger discovery
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

### Provider Properties

| Property | Value |
|---|---|
| `provider.isRingWallet` | `true` |
| `provider.isMetaMask` | `false` |
| `window.ringWallet.version` | `"1.0.0"` |

### Core Method: `provider.request(args)`

All RPC interactions go through a single method:

```typescript
interface RequestArguments {
  method: string
  params?: unknown[] | object
}

const result = await provider.request({ method, params })
```

---

## Supported RPC Methods

### Account Methods

| Method | Description | User Approval |
|---|---|---|
| `eth_requestAccounts` | Request wallet connection, returns authorized accounts | Yes (first time) |
| `eth_accounts` | Get already-connected accounts | No |

### Chain Information

| Method | Description | User Approval |
|---|---|---|
| `eth_chainId` | Current chain ID (hex string, e.g. `"0x1"`) | No |
| `net_version` | Current network version (decimal string) | No |

### Read-Only Queries (forwarded to RPC node)

These calls are sent directly to the blockchain RPC node — no user approval needed.

| Method | Description |
|---|---|
| `eth_call` | Execute a read-only message call |
| `eth_estimateGas` | Estimate gas for a transaction |
| `eth_getBalance` | Query address balance |
| `eth_getBlockByNumber` | Get block by number |
| `eth_getBlockByHash` | Get block by hash |
| `eth_getTransactionByHash` | Get transaction by hash |
| `eth_getTransactionReceipt` | Get transaction receipt |
| `eth_getTransactionCount` | Get address nonce |
| `eth_getCode` | Get contract bytecode |
| `eth_getStorageAt` | Read contract storage |
| `eth_getLogs` | Query event logs |
| `eth_gasPrice` | Get current gas price |
| `eth_blockNumber` | Get latest block number |

### Transactions & Signing (require user approval)

| Method | Description |
|---|---|
| `eth_sendTransaction` | Sign and broadcast a transaction |
| `personal_sign` | Sign a plaintext message |
| `eth_signTypedData_v4` | EIP-712 structured data signature |
| `eth_signTypedData_v3` | EIP-712 structured data signature (v3) |

### Chain Management (require user approval)

| Method | Description |
|---|---|
| `wallet_switchEthereumChain` | Switch to a different chain |
| `wallet_addEthereumChain` | Add a new chain |

---

## Event Handling

The provider emits standard EIP-1193 events. **You should always listen to these** to keep your UI in sync.

### `accountsChanged`

Fired when the user switches accounts in Ring Wallet.

```javascript
provider.on('accountsChanged', (accounts) => {
  if (accounts.length === 0) {
    // User disconnected
  } else {
    // Update your UI with accounts[0]
  }
})
```

### `chainChanged`

Fired when the active chain changes. **Recommended: reload the page** to avoid stale state.

```javascript
provider.on('chainChanged', (chainId) => {
  // chainId is a hex string, e.g. "0x1"
  window.location.reload()
})
```

### `connect`

```javascript
provider.on('connect', (connectInfo) => {
  console.log('Connected to chain:', connectInfo.chainId)
})
```

### `disconnect`

```javascript
provider.on('disconnect', (error) => {
  console.log('Disconnected:', error.message)
})
```

### Removing Listeners

```javascript
function onChainChanged(chainId) { /* ... */ }

provider.on('chainChanged', onChainChanged)
// Later:
provider.removeListener('chainChanged', onChainChanged)
```

---

## Working with Popular Libraries

### wagmi v2+ / viem

wagmi v2+ natively supports EIP-6963. Ring Wallet appears automatically in the connector list:

```javascript
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

// Ring Wallet is auto-discovered — no extra config needed
```

### RainbowKit v2+

RainbowKit v2+ also uses EIP-6963 under the hood. Ring Wallet will show up alongside other detected wallets in the connect modal.

### ethers.js v6

```javascript
import { BrowserProvider } from 'ethers'

const provider = new BrowserProvider(window.ethereum)
const signer = await provider.getSigner()

// Read the connected address
const address = await signer.getAddress()

// Send a transaction
const tx = await signer.sendTransaction({
  to: '0xRecipient...',
  value: ethers.parseEther('0.01')
})
await tx.wait()
```

### ethers.js v5

```javascript
import { ethers } from 'ethers'

const provider = new ethers.providers.Web3Provider(window.ethereum)
await provider.send('eth_requestAccounts', [])
const signer = provider.getSigner()
```

### web3.js

```javascript
import Web3 from 'web3'

const web3 = new Web3(window.ethereum)
const accounts = await web3.eth.requestAccounts()
const balance = await web3.eth.getBalance(accounts[0])
```

---

## Common Scenarios

### 1. Connect Wallet

```javascript
async function connectWallet() {
  try {
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    })
    return accounts[0]
  } catch (err) {
    if (err.code === 4001) {
      console.log('User rejected the connection request')
    }
    return null
  }
}
```

### 2. Send ETH

```javascript
async function sendETH(to, amountInEth) {
  const accounts = await provider.request({ method: 'eth_accounts' })
  const value = '0x' + BigInt(Math.floor(amountInEth * 1e18)).toString(16)

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: to,
      value: value,
    }]
  })
  return txHash
}
```

### 3. Call a Smart Contract (Write)

```javascript
async function approveERC20(tokenAddress, spenderAddress, amount) {
  const accounts = await provider.request({ method: 'eth_accounts' })

  // approve(address,uint256) selector = 0x095ea7b3
  const data = '0x095ea7b3'
    + spenderAddress.slice(2).padStart(64, '0')
    + BigInt(amount).toString(16).padStart(64, '0')

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: tokenAddress,
      data: data,
    }]
  })
  return txHash
}
```

### 4. Sign a Message (for login / verification)

```javascript
async function signMessage(message) {
  const accounts = await provider.request({ method: 'eth_accounts' })

  // Convert message to hex
  const msgHex = '0x' + Array.from(new TextEncoder().encode(message))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const signature = await provider.request({
    method: 'personal_sign',
    params: [msgHex, accounts[0]]
  })
  return signature
}
```

### 5. EIP-712 Typed Data Signature

```javascript
async function signTypedData(typedData) {
  const accounts = await provider.request({ method: 'eth_accounts' })

  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [accounts[0], JSON.stringify(typedData)]
  })
  return signature
}
```

### 6. Switch Network

```javascript
async function switchToSepolia() {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }]  // Sepolia = 11155111
    })
  } catch (err) {
    if (err.code === 4902) {
      console.log('This chain has not been added to the wallet')
    } else if (err.code === 4001) {
      console.log('User rejected the switch request')
    }
  }
}
```

---

## Error Handling

Ring Wallet uses standard EIP-1193 error codes:

| Code | Name | Description |
|---|---|---|
| `4001` | User Rejected | The user rejected the request (connect / transaction / signature) |
| `4100` | Unauthorized | The requested method or account is not authorized |
| `4200` | Unsupported Method | The method is not supported, or the request timed out |
| `4900` | Disconnected | The provider is disconnected from all chains |
| `4901` | Chain Disconnected | The provider is disconnected from the specified chain |
| `4902` | Chain Not Added | The wallet does not recognize the requested chain |

### Example

```javascript
try {
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [tx]
  })
} catch (err) {
  switch (err.code) {
    case 4001:
      showToast('Transaction cancelled by user')
      break
    case 4100:
      showToast('Please connect your wallet first')
      break
    case 4200:
      showToast('Request timed out — please try again')
      break
    case 4900:
      showToast('Wallet disconnected')
      break
    default:
      showToast('Transaction failed: ' + err.message)
  }
}
```

### Timeout

Requests that require user approval (transactions, signatures) have a **5-minute timeout**. If the user doesn't respond within that window, the request is automatically rejected with error code `4200`.

---

## Detecting Ring Wallet

### Check if running inside Ring Wallet

```javascript
function isInRingWallet() {
  return !!(
    window.ringWallet ||
    (window.ethereum && window.ethereum.isRingWallet)
  )
}
```

### Check if running in an iframe

```javascript
function isInIframe() {
  try {
    return window.self !== window.top
  } catch (_) {
    return true
  }
}
```

### Conditional behavior

```javascript
if (isInRingWallet()) {
  // Running inside Ring Wallet — you can skip wallet-select UI
  // and connect directly
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  })
} else {
  // Running standalone — show your normal wallet-connect modal
}
```

---

## Security Considerations

### iframe Sandbox

Your DApp runs inside a sandboxed iframe with the following permissions:

| Permission | Granted | Reason |
|---|---|---|
| `allow-scripts` | Yes | Your DApp needs to execute JavaScript |
| `allow-same-origin` | Yes | Access to your origin's resources (API calls, localStorage, etc.) |
| `allow-forms` | Yes | Form submissions |
| `allow-popups` | Yes | External links that open new windows |
| `allow-modals` | Yes | `alert()` / `confirm()` dialogs |
| `allow-top-navigation` | **No** | DApps cannot navigate the parent window |
| `allow-downloads` | **No** | Automatic downloads are blocked |

### postMessage Origin

All `postMessage` communication between the SDK and Ring Wallet uses origin validation on the wallet side. Your DApp does not need to handle this — the SDK manages it automatically.

### User Approval Flow

Every sensitive operation triggers a user-visible approval dialog in Ring Wallet:

- **Connect:** User sees your DApp name/URL and confirms sharing their address.
- **Transaction:** User sees transaction details (recipient, value, estimated gas) and confirms.
- **Signature:** User sees the message content and confirms signing.
- **Chain Switch:** User sees the target chain and confirms switching.

Your DApp **cannot bypass** these approval steps.

### Safe Outside Ring Wallet

The SDK script loads safely in any environment. Outside of an iframe (i.e., when there is no parent window), `postMessage` calls simply have no target. The SDK will not interfere with other wallets or providers already on the page.

---

## FAQ

### Q: What do I need to do to integrate?

Add one `<script>` tag pointing to `dappsdk.js` in your HTML `<head>`, before your app bundle. That's it. If your DApp already uses standard Ethereum libraries, no other code changes are needed.

### Q: Which chains does Ring Wallet support?

Ring Wallet supports multiple EVM-compatible chains. The exact list depends on the wallet's configuration. You can query the current chain with `eth_chainId` and request a switch with `wallet_switchEthereumChain`.

### Q: Why is my DApp not detecting Ring Wallet?

Check that:
1. `dappsdk.js` is included in your HTML and loads **before** your application code.
2. There are no load errors for the script in the browser console.
3. Your DApp is loaded inside Ring Wallet's iframe (the SDK only activates in iframe mode).
4. You are listening for EIP-6963 `eip6963:announceProvider` events, or reading `window.ethereum`.

### Q: Can I test locally?

Yes. Include `dappsdk.js` in your local HTML page and load it inside an iframe whose parent window implements the Ring Wallet bridge protocol. Contact the Ring Wallet team for a test harness if needed.

### Q: What happens if the user closes Ring Wallet mid-transaction?

Pending requests will time out after 5 minutes and reject with error code `4200`. Your DApp should handle this gracefully.

### Q: Will the SDK interfere with MetaMask or other wallets?

No. The SDK only sets `window.ethereum` if it is not already occupied by another provider. It always announces itself via EIP-6963, so wallet-connect libraries can present Ring Wallet alongside other wallets without conflicts.

### Q: How do I get my DApp listed in Ring Wallet?

Contact the Ring Wallet team to submit your DApp for listing. You will need to provide:
- DApp name and description
- Entry URL (with `dappsdk.js` already integrated)
- Icon (recommended: 256×256 PNG or SVG)
- Supported chain IDs
- Category (DeFi, NFT, Games, Tools, etc.)

---

## Global Objects Reference

| Object | Description |
|---|---|
| `window.ethereum` | EIP-1193 Provider instance (if not already set by another wallet) |
| `window.ringWallet.provider` | EIP-1193 Provider instance (always available) |
| `window.ringWallet.version` | SDK version string |

## EIP-6963 Provider Info

| Field | Value |
|---|---|
| `name` | `"Ring Wallet"` |
| `rdns` | `"org.testring.ringwallet"` |
| `icon` | SVG data URI (Ring Wallet logo) |
| `uuid` | Unique per page load |

---

## Support

For technical questions or to request DApp listing, contact the Ring Wallet team.
