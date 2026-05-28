import React, { useState } from 'react'

export interface ExplorerDialogProps {
  url: string
  onClose: () => void
}

const ExplorerDialog: React.FC<ExplorerDialogProps> = ({ url, onClose }) => {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="swap-explorer-dialog">
      <button
        type="button"
        className="swap-explorer-dialog__backdrop"
        onClick={onClose}
        aria-label="Close explorer"
      />
      <div className="swap-explorer-dialog__panel">
        <div className="swap-explorer-dialog__header">
          <span className="swap-explorer-dialog__title">Explorer</span>
          <button
            type="button"
            className="swap-explorer-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
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
        </div>
        <div className="swap-explorer-dialog__body">
          {!loaded && (
            <div className="swap-explorer-dialog__loading">
              <div className="dapp-list__spinner" />
              <span>Loading…</span>
            </div>
          )}
          <iframe
            className="swap-explorer-dialog__iframe"
            src={url}
            title="Explorer"
            onLoad={() => setLoaded(true)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  )
}

export default ExplorerDialog
