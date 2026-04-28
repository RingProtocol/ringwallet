// Minimal background service worker for Manifest V3.
// No DApp integration in the extension version.

declare const chrome: {
  runtime: {
    onInstalled: {
      addListener: (callback: () => void) => void
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.warn('[Ring Wallet] Extension installed')
})
