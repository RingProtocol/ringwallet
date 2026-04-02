'use strict'
;(function () {
  'use strict'
  if (window.__ringWalletInitialized) return
  window.__ringWalletInitialized = !0
  var s = !1
  try {
    s = window.self !== window.top
  } catch {
    s = !0
  }
  function a(e, n, t) {
    var i = new Error(n)
    return ((i.code = e), (i.data = t), i)
  }
  function r() {
    ;((this._chainId = null),
      (this._accounts = []),
      (this._connected = !1),
      (this._requestId = 0),
      (this._pendingRequests = {}),
      (this._eventListeners = {}),
      (this.isRingWallet = !0),
      (this.isMetaMask = !1),
      (this._REQUEST_TIMEOUT = 3e5),
      this._setupMessageListener(),
      this._handshake())
  }
  ;((r.prototype.request = function (e) {
    if (!e || typeof e.method != 'string')
      return Promise.reject(a(-32600, 'Invalid request'))
    var n = e.method,
      t = e.params || []
    return n === 'eth_accounts'
      ? Promise.resolve(this._accounts.slice())
      : n === 'eth_chainId'
        ? Promise.resolve(this._chainId)
        : n === 'net_version'
          ? Promise.resolve(
              this._chainId ? String(parseInt(this._chainId, 16)) : null
            )
          : this._sendToWallet(n, t)
  }),
    (r.prototype.enable = function () {
      return this.request({ method: 'eth_requestAccounts' })
    }),
    (r.prototype.send = function (e, n) {
      if (typeof e == 'string') return this.request({ method: e, params: n })
      if (typeof e == 'object' && !n) return this.request(e)
      if (typeof n == 'function') {
        var t = this
        this.request(e)
          .then(function (i) {
            n(null, { id: e.id, jsonrpc: '2.0', result: i })
          })
          .catch(function (i) {
            n(i, null)
          })
        return
      }
    }),
    (r.prototype.sendAsync = function (e, n) {
      var t = this
      this.request({ method: e.method, params: e.params })
        .then(function (i) {
          n(null, { id: e.id, jsonrpc: '2.0', result: i })
        })
        .catch(function (i) {
          n(i, null)
        })
    }),
    (r.prototype.on = function (e, n) {
      return (
        this._eventListeners[e] || (this._eventListeners[e] = []),
        this._eventListeners[e].push(n),
        this
      )
    }),
    (r.prototype.removeListener = function (e, n) {
      var t = this._eventListeners[e]
      return t
        ? ((this._eventListeners[e] = t.filter(function (i) {
            return i !== n
          })),
          this)
        : this
    }),
    (r.prototype.removeAllListeners = function (e) {
      return (
        e ? delete this._eventListeners[e] : (this._eventListeners = {}),
        this
      )
    }),
    (r.prototype._emit = function (e) {
      var n = Array.prototype.slice.call(arguments, 1),
        t = this._eventListeners[e]
      if (t)
        for (var i = 0; i < t.length; i++)
          try {
            t[i].apply(null, n)
          } catch (o) {
            console.error('[RingWallet] event error:', o)
          }
    }),
    (r.prototype._sendToWallet = function (e, n) {
      var t = this
      return new Promise(function (i, o) {
        var c = ++t._requestId,
          h = setTimeout(function () {
            t._pendingRequests[c] &&
              (delete t._pendingRequests[c], o(a(4200, 'Request timeout')))
          }, t._REQUEST_TIMEOUT)
        ;((t._pendingRequests[c] = { resolve: i, reject: o, timer: h }),
          window.parent.postMessage(
            { type: 'ring_wallet_request', id: c, method: e, params: n },
            '*'
          ))
      })
    }),
    (r.prototype._setupMessageListener = function () {
      var e = this
      window.addEventListener('message', function (n) {
        var t = n.data
        if (!(!t || typeof t != 'object')) {
          if (t.type === 'ring_wallet_response') {
            var i = e._pendingRequests[t.id]
            if (!i) return
            ;(clearTimeout(i.timer),
              delete e._pendingRequests[t.id],
              t.error
                ? i.reject(a(t.error.code, t.error.message, t.error.data))
                : i.resolve(t.result))
          }
          ;(t.type === 'ring_wallet_event' &&
            e._handleWalletEvent(t.event, t.data),
            t.type === 'ring_wallet_handshake_ack' &&
              ((e._chainId = t.chainId || null),
              t.accounts &&
                t.accounts.length > 0 &&
                ((e._accounts = t.accounts), (e._connected = !0))))
        }
      })
    }),
    (r.prototype._handleWalletEvent = function (e, n) {
      switch (e) {
        case 'chainChanged':
          ;((this._chainId = n), this._emit('chainChanged', n))
          break
        case 'accountsChanged':
          ;((this._accounts = n || []),
            this._emit('accountsChanged', this._accounts))
          break
        case 'connect':
          ;((this._connected = !0),
            n && n.chainId && (this._chainId = n.chainId),
            this._emit('connect', n))
          break
        case 'disconnect':
          ;((this._connected = !1),
            (this._accounts = []),
            this._emit('disconnect', n))
          break
      }
    }),
    (r.prototype._handshake = function () {
      s &&
        window.parent.postMessage(
          { type: 'ring_wallet_handshake', version: '1.0.0' },
          '*'
        )
    }))
  var u = new r()
  if (s || typeof window.ethereum > 'u')
    try {
      Object.defineProperty(window, 'ethereum', {
        value: u,
        writable: !1,
        configurable: !0,
      })
    } catch {
      try {
        window.ethereum = u
      } catch {}
    }
  var l = {
    uuid:
      typeof crypto < 'u' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'ring-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    name: 'Ring Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNjY3ZWVhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNzY0YmEyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMTIiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
    rdns: 'org.testring.ringwallet',
  }
  function d() {
    var e = Object.freeze({ info: Object.freeze(l), provider: u })
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: e })
    )
  }
  ;(window.addEventListener('eip6963:requestProvider', function () {
    d()
  }),
    d(),
    document.readyState === 'loading' &&
      document.addEventListener('DOMContentLoaded', d),
    console.dbg(
      '[Ring Wallet] DApp SDK v1.0.0 initialized' + (s ? ' (iframe mode)' : '')
    ))
})()
