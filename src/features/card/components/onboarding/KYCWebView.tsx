import React, { useState, useCallback } from 'react'
import '../Card.css'

interface Props {
  url: string
  onComplete: () => void
  onError: (error: string) => void
}

const KYCWebView: React.FC<Props> = ({ url, onComplete, onError }) => {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const handleLoad = useCallback(() => {
    setLoading(false)
    setLoadError(null)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    const errorMsg = 'Failed to load KYC page. Please check your connection and try again.'
    setLoadError(errorMsg)
    onError(errorMsg)
  }, [onError])

  const handleClose = useCallback(() => {
    onComplete()
  }, [onComplete])

  return (
    <div className="kyc-webview">
      <div className="kyc-webview__toolbar">
        <button
          type="button"
          className="kyc-webview__close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className="kyc-webview__toolbar-title">Identity Verification</span>
        <div className="kyc-webview__toolbar-spacer" />
      </div>

      <div className="kyc-webview__content">
        {loading && (
          <div className="kyc-webview__loading">
            <div className="kyc-webview__spinner" />
            <p className="kyc-webview__loading-text">Loading verification...</p>
          </div>
        )}

        {loadError && (
          <div className="kyc-webview__error">
            <p className="kyc-webview__error-text">{loadError}</p>
            <button
              type="button"
              className="kyc-webview__retry"
              onClick={() => {
                setLoading(true)
                setLoadError(null)
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loadError && (
          <iframe
            className="kyc-webview__iframe"
            src={url}
            title="KYC Verification"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          />
        )}
      </div>
    </div>
  )
}

export default KYCWebView
