/**
 * Ring Wallet DApp SDK v1.0.0
 *
 * Canonical source: this repo public/dappsdk.js (served at /dappsdk.js when deployed).
 * Code that injects or references this script uses src/server/dappsdk.ts.
 *
 * Drop this script into any DApp to enable communication with Ring Wallet
 * when loaded inside the wallet's iframe container.
 *
 * Implements:
 *   - EIP-1193 (Ethereum Provider JavaScript API)
 *   - EIP-6963 (Multi Injected Provider Discovery)
 *
 * Usage: see documents/dapp-integration.md (self-host this file or load from wallet host).
 */
;(function () {
  'use strict'

  if (window.__ringWalletInitialized) return
  window.__ringWalletInitialized = true

  // ────────────────────────────────────────────────────
  //  Environment detection
  // ────────────────────────────────────────────────────

  var isInIframe = false
  try {
    isInIframe = window.self !== window.top
  } catch (_) {
    isInIframe = true
  }

  // ────────────────────────────────────────────────────
  //  Network proxy — intercept fetch/XHR so all DApp
  //  HTTP traffic goes through our proxy-asset endpoint
  //  (eliminates CORS for DApp API calls)
  // ────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────
  //  ProviderRpcError
  // ────────────────────────────────────────────────────

  function ProviderRpcError(code, message, data) {
    var err = new Error(message)
    err.code = code
    err.data = data
    return err
  }

  // ────────────────────────────────────────────────────
  //  RingWalletProvider  (EIP-1193)
  // ────────────────────────────────────────────────────

  function RingWalletProvider() {
    this._chainId = null
    this._accounts = []
    this._connected = false
    this._requestId = 0
    this._pendingRequests = {} // id → { resolve, reject, timer }
    this._eventListeners = {} // eventName → [fn]
    this.isRingWallet = true
    this.isMetaMask = false

    this._REQUEST_TIMEOUT = 300000 // 5 minutes

    this._setupMessageListener()
    this._handshake()
  }

  // ── request (EIP-1193 core) ────────────────────────

  RingWalletProvider.prototype.request = function (args) {
    if (!args || typeof args.method !== 'string') {
      return Promise.reject(ProviderRpcError(-32600, 'Invalid request'))
    }

    var method = args.method
    var params = args.params || []

    // Methods that can be answered locally
    if (method === 'eth_accounts')
      return Promise.resolve(this._accounts.slice())
    if (method === 'eth_chainId') return Promise.resolve(this._chainId)
    if (method === 'net_version') {
      return Promise.resolve(
        this._chainId ? String(parseInt(this._chainId, 16)) : null
      )
    }

    return this._sendToWallet(method, params)
  }

  // ── Legacy convenience (some DApps still use these) ─

  RingWalletProvider.prototype.enable = function () {
    return this.request({ method: 'eth_requestAccounts' })
  }

  RingWalletProvider.prototype.send = function (
    methodOrPayload,
    paramsOrCallback
  ) {
    // send(method, params) → Promise
    if (typeof methodOrPayload === 'string') {
      return this.request({ method: methodOrPayload, params: paramsOrCallback })
    }
    // send({ method, params }) → Promise
    if (typeof methodOrPayload === 'object' && !paramsOrCallback) {
      return this.request(methodOrPayload)
    }
    // send({ method, params }, callback) → void (legacy JSON-RPC)
    if (typeof paramsOrCallback === 'function') {
      var self = this
      this.request(methodOrPayload)
        .then(function (result) {
          paramsOrCallback(null, {
            id: methodOrPayload.id,
            jsonrpc: '2.0',
            result: result,
          })
        })
        .catch(function (err) {
          paramsOrCallback(err, null)
        })
      return
    }
  }

  RingWalletProvider.prototype.sendAsync = function (payload, callback) {
    var self = this
    this.request({ method: payload.method, params: payload.params })
      .then(function (result) {
        callback(null, { id: payload.id, jsonrpc: '2.0', result: result })
      })
      .catch(function (err) {
        callback(err, null)
      })
  }

  // ── Event emitter (EIP-1193 events) ────────────────

  RingWalletProvider.prototype.on = function (eventName, listener) {
    if (!this._eventListeners[eventName]) {
      this._eventListeners[eventName] = []
    }
    this._eventListeners[eventName].push(listener)
    return this
  }

  RingWalletProvider.prototype.removeListener = function (eventName, listener) {
    var arr = this._eventListeners[eventName]
    if (!arr) return this
    this._eventListeners[eventName] = arr.filter(function (fn) {
      return fn !== listener
    })
    return this
  }

  RingWalletProvider.prototype.removeAllListeners = function (eventName) {
    if (eventName) {
      delete this._eventListeners[eventName]
    } else {
      this._eventListeners = {}
    }
    return this
  }

  RingWalletProvider.prototype._emit = function (eventName) {
    var args = Array.prototype.slice.call(arguments, 1)
    var arr = this._eventListeners[eventName]
    if (!arr) return
    for (var i = 0; i < arr.length; i++) {
      try {
        arr[i].apply(null, args)
      } catch (e) {
        console.error('[RingWallet] event error:', e)
      }
    }
  }

  // ── postMessage transport ──────────────────────────

  RingWalletProvider.prototype._sendToWallet = function (method, params) {
    var self = this
    return new Promise(function (resolve, reject) {
      var id = ++self._requestId

      var timer = setTimeout(function () {
        if (self._pendingRequests[id]) {
          delete self._pendingRequests[id]
          reject(ProviderRpcError(4200, 'Request timeout'))
        }
      }, self._REQUEST_TIMEOUT)

      self._pendingRequests[id] = {
        resolve: resolve,
        reject: reject,
        timer: timer,
      }

      window.parent.postMessage(
        {
          type: 'ring_wallet_request',
          id: id,
          method: method,
          params: params,
        },
        '*'
      )
    })
  }

  RingWalletProvider.prototype._setupMessageListener = function () {
    var self = this
    window.addEventListener('message', function (event) {
      var data = event.data
      if (!data || typeof data !== 'object') return

      // Response to a pending request
      if (data.type === 'ring_wallet_response') {
        var pending = self._pendingRequests[data.id]
        if (!pending) return
        clearTimeout(pending.timer)
        delete self._pendingRequests[data.id]

        if (data.error) {
          pending.reject(
            ProviderRpcError(
              data.error.code,
              data.error.message,
              data.error.data
            )
          )
        } else {
          pending.resolve(data.result)
        }
      }

      // Wallet-initiated event
      if (data.type === 'ring_wallet_event') {
        self._handleWalletEvent(data.event, data.data)
      }

      // Handshake acknowledgement
      if (data.type === 'ring_wallet_handshake_ack') {
        self._chainId = data.chainId || null
        if (data.accounts && data.accounts.length > 0) {
          self._accounts = data.accounts
          self._connected = true
        }
      }
    })
  }

  RingWalletProvider.prototype._handleWalletEvent = function (event, data) {
    switch (event) {
      case 'chainChanged':
        this._chainId = data
        this._emit('chainChanged', data)
        break
      case 'accountsChanged':
        this._accounts = data || []
        this._emit('accountsChanged', this._accounts)
        break
      case 'connect':
        this._connected = true
        if (data && data.chainId) this._chainId = data.chainId
        this._emit('connect', data)
        break
      case 'disconnect':
        this._connected = false
        this._accounts = []
        this._emit('disconnect', data)
        break
    }
  }

  RingWalletProvider.prototype._handshake = function () {
    if (!isInIframe) return
    window.parent.postMessage(
      {
        type: 'ring_wallet_handshake',
        version: '1.0.0',
      },
      '*'
    )
  }

  // ────────────────────────────────────────────────────
  //  Instantiate the provider
  // ────────────────────────────────────────────────────

  var provider = new RingWalletProvider()

  // ────────────────────────────────────────────────────
  //  Inject as window.ethereum (legacy compatibility)
  // ────────────────────────────────────────────────────
  //
  // When running inside Ring Wallet's iframe, always override window.ethereum
  // even if MetaMask extension already injected its provider into this frame.
  // When loaded as a standalone page (no iframe), only inject if no other wallet
  // is present so we don't conflict with MetaMask in the user's main browser.

  if (isInIframe || typeof window.ethereum === 'undefined') {
    try {
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: true,
      })
    } catch (_e1) {
      // MetaMask (some versions) sets the property as non-configurable.
      // Fall back to direct assignment so Ring Wallet still wins inside the iframe.
      try {
        window.ethereum = provider
      } catch (_e2) {}
    }
  }

  // ────────────────────────────────────────────────────
  //  EIP-6963 Provider Discovery
  // ────────────────────────────────────────────────────

  var walletInfo = {
    uuid:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'ring-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    name: 'Ring Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNjY3ZWVhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNzY0YmEyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMTIiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
    rdns: 'org.testring.ringwallet',
  }

  function announceProvider() {
    var detail = Object.freeze({
      info: Object.freeze(walletInfo),
      provider: provider,
    })

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: detail })
    )
  }

  window.addEventListener('eip6963:requestProvider', function () {
    announceProvider()
  })

  // Announce immediately so early-loading DApps see us
  announceProvider()

  // Also announce on DOMContentLoaded in case the event loop hasn't reached DApp code yet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceProvider)
  }

  console.log(
    '[Ring Wallet] DApp SDK v1.0.0 initialized' +
      (isInIframe ? ' (iframe mode)' : '')
  )
})()
