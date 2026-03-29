# Ring Wallet

## Vision

Ring Wallet is a new kind of crypto wallet: **no passwords, no mnemonics, no friction.** You sign in with your fingerprint. You keep full control of your keys. You pay no extra fees on transactions.

We believe ownership should feel natural, safe, and open. Ring Wallet is our step toward that future.

| Principle                    | What it means                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **No password, no mnemonic** | Log in with your fingerprint. No seed phrases to write down or lose.                                      |
| **Self-custody**             | Your keys, your assets. We don’t hold them for you.                                                       |
| **No extra fee**             | We don’t add transaction fees on top of network costs.                                                    |
| **AI Agent friendly**        | Built so agents and automation can interact with your wallet in a secure, programmable way.               |
| **Listener to your voice**   | Designed to respond to how you want to use crypto—simple when you want simple, powerful when you need it. |

---

## License

Ring Wallet is **open source** under the **GPL License**.  
You are free to use, modify, and distribute the code for **personal and non-commercial purposes** at no cost. Commercial use is not permitted.

---

## Contributing

**Let's build together.**

Ring Wallet is open source, and we welcome contributions from everyone. If you want to contribute code, report issues, or extend the wallet for your own use case, this repo is the place. Ideas, code, and feedback are welcome.

Check out our [issues](https://github.com/ringprotocol/wallet/issues) for current goals and tasks.

---

## Powered by Ring

Ring Wallet is powered by **[Ring](https://ring.exchange)**.  
Live at [wallet.ring.exchange](https://wallet.ring.exchange).

---

## Get started

Clone the repository (including the `docs` submodule):

```bash
git clone --recurse-submodules <repo-url>
```

If you already cloned without submodules, run:

```bash
git submodule update --init --recursive
```

Then install and start the dev server:

```bash
yarn install
yarn dev
```

Then open the app in your browser and sign in with your fingerprint.

If you run the Vite PWA dev server on `http://localhost:3003`, keep the Next server running on `http://localhost:3000` as well. Client-side `/api/v1/*` requests are resolved to the Next server, not the Vite dev server. You can override that target explicitly with `VITE_API_BASE_URL`.

---

## Usage Guide

For installation and usage instructions, visit our docs:  
[https://docs.ring.exchange/wallet/install-pwa](https://docs.ring.exchange/wallet/install-pwa)

---

_Own your keys. Own your future._

# Debugging dapp

- Apply dapp: https://forms.gle/2GXh5bAEXxpDj8gTA

# Dependent Variables

VITE_DAPP_URL=https://script.google.com/macros/s/AKfycbzFSlcUVztjCGIHesC0WFG-QP8MnPrfvZdKnYOTboATM7Vtgg8ExRwfo_Jlkh7Pf8FC9A/exec
DAPP_TOKEN=
VITE_API_BASE_URL=http://localhost:3000
VITE_TEST_API_KEY=<Contact Ring to get>

# tx history

- if activity is empty, search one time from etherscan;
- if transaction happen, insert a pending transaction record, poll from blockchain every 8 seconds with rpc endpoint
- after transaction is confirmed, update the status
- fetch from rpc when open the wallet first time.
