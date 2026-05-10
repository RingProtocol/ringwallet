# Ring Wallet — DApp Integration

**How does RingWallet run?** RingWallet is a web wallet that opens DApps in an iframe and injects `window.ethereum`, which meets [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) and [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193).

## 1. Register Your DApp

Contact the Ring Wallet team to register your DApp. Provide:

- **DApp Name**
- **Logo** (256×256 PNG or SVG)
- **DApp URL** (e.g. `https://your-dapp.com`)

You will receive an **API Key** (UUID) for testing.

---

## 2. Integrate the SDK

**Single source of truth:** The SDK is maintained in this repo as **`public/dappsdk.js`** (served at `/dappsdk.js` when the wallet is deployed). All injection and path references in code go through `src/server/dappsdk.ts`. When you change the SDK, only edit `public/dappsdk.js`.

### 2.1 Add `dappsdk.js` to your project

You can either **self-host** the SDK or **load it from Ring Wallet**. Self-hosting is recommended so your DApp does not depend on the wallet server at runtime.

**Option A — Self-host (recommended)**  
Copy **`public/dappsdk.js`** from this repo into your DApp’s static/public directory, then use `src="/dappsdk.js"` in the script tag.

| Framework   | Location                    |
| ----------- | --------------------------- |
| Plain HTML  | Same directory as your HTML |
| React (CRA) | `public/dappsdk.js`         |
| Next.js     | `public/dappsdk.js`         |
| Vue (Vite)  | `public/dappsdk.js`         |

**Option B — Load from Ring Wallet**  
Use the script URL from the wallet host (e.g. `https://wallet.ring.exchange/dappsdk.js`). You always get the latest SDK, but your DApp depends on that origin being available and you must allow it in CSP (see §2.3).

### 2.2 Add the script tag

**If self-hosting**, add the following `<script>` tag to the **top of `<head>`**, **before** your application bundle:

```html
<head>
  <script src="/dappsdk.js"></script>
  <!-- your app scripts below -->
</head>
```

**If loading from Ring Wallet**, use the full URL (replace with your actual Ring Wallet host if different):

```html
<head>
  <script src="https://wallet.ring.exchange/dappsdk.js"></script>
  <!-- your app scripts below -->
</head>
```

**Next.js (App Router)** — `app/layout.tsx` (use the full Ring Wallet URL if you chose Option B):

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

**Next.js (Pages Router)** — `pages/_document.tsx`:

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

### 2.3 Allow CSP (if applicable)

If your DApp uses `Content-Security-Policy` headers or meta tags, make sure the policy allows the SDK script to run. Add the following to your `script-src` directive:

```
script-src 'self' 'unsafe-inline';
```

Or if you reference the SDK from a CDN:

```
script-src 'self' https://wallet.ring.exchange
```

If you don't have a CSP configured, no changes are needed.

### 2.4 What the SDK Injects

The SDK uses two standard Ethereum interfaces:

**`window.ethereum` (EIP-1193)**

The SDK sets `window.ethereum` to a Ring Wallet provider with an extra property `isRingWallet = true` for identification.

- **When running inside Ring Wallet's iframe** — the SDK always overrides `window.ethereum`, even if MetaMask (or another wallet extension) has already injected its own provider into the frame. This ensures that a PC user with MetaMask installed still connects through Ring Wallet when they open your DApp from the wallet.
- **When loaded as a standalone page** (DApp opened directly in the browser, not in the wallet iframe) — the SDK only injects if `window.ethereum` is not already set, so it does not conflict with MetaMask or other extensions in the user's normal browser session.

```javascript
window.ethereum // EIP-1193 Provider
window.ethereum.isRingWallet // true
```

**EIP-6963 Provider Discovery**

The SDK announces Ring Wallet via the standard EIP-6963 event mechanism, so libraries like wagmi v2+ and RainbowKit v2+ detect it automatically.

| Field  | Value                    |
| ------ | ------------------------ |
| `name` | `"Ring Wallet"`          |
| `rdns` | `"exchange.ring.wallet"` |

To detect Ring Wallet specifically via EIP-6963:

```javascript
window.addEventListener('eip6963:announceProvider', (event) => {
  if (event.detail.info.rdns === 'exchange.ring.wallet') {
    const provider = event.detail.provider
    // use provider...
  }
})
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

To check if running inside Ring Wallet:

```javascript
function isInRingWallet() {
  return !!(window.ethereum && window.ethereum.isRingWallet)
}
```

### 2.5 Done

If your DApp uses standard Ethereum libraries (wagmi, ethers.js, web3.js, RainbowKit, etc.), **no further code changes are needed**. The SDK sets up `window.ethereum` and announces via EIP-6963 automatically.

### 2.6 X-Frame-Options (allow iframe embedding)

If Ring Wallet opens your DApp directly in an iframe (the iframe `src` points to your DApp URL), and your site responds with `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`, the browser will refuse to load it and you will see an error like:

```text
Refused to display 'https://your-dapp.com/' in a frame because it set 'X-Frame-Options' to 'deny'.
```

Fix: remove/adjust that response header (common sources: Next.js `headers`, Vercel `vercel.json`, or security headers set by a reverse proxy/CDN) so the page can be embedded by Ring Wallet’s iframe.

## 3. Test

Open Ring Wallet with your API Key in the URL:

```
https://wallet.ring.exchange/?testdapp=YOUR_API_KEY
```

For example:

```
http://localhost:3000/?testdapp=a3f2b1c8-9d4e-4f5a-b6c7-1234567890ab
```

Your DApp will appear in the DApp list even while in review. Click it to verify:

- [ ] Wallet connect dialog appears
- [ ] Transactions trigger the confirmation dialog
- [ ] Signature requests work
- [ ] Rejecting a request returns an error to your DApp

Once verified, notify the Ring Wallet team to set your DApp to **active**.
