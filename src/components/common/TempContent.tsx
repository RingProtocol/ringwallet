import React from 'react'
import './TempContent.css'

/**
 * TempContent — a transient content placeholder for the page content area.
 *
 * Displays contextual feedback while the real content is unavailable:
 *  - **loading**  → spinner + "Loading…" (or custom `children`).
 *  - **error**    → "Network error, please retry." (or custom `children`) + Retry button.
 *  - **custom**   → pass arbitrary `children` for any other temporary state.
 *
 * Props:
 *  @param status   - `'loading'` | `'error'` — determines the default message & UI.
 *  @param onRetry  - Callback fired when the user taps Retry (only shown when `status === 'error'`).
 *  @param children - Optional override for the default message text.
 */

export interface TempContentProps {
  status: 'loading' | 'error'
  onRetry?: () => void
  children?: React.ReactNode
}

const TempContent: React.FC<TempContentProps> = ({
  status,
  onRetry,
  children,
}) => {
  return (
    <div className="temp-content" role="status" aria-live="polite">
      {status === 'loading' && <div className="temp-content__spinner" />}

      <div className="temp-content__message">
        {children ??
          (status === 'loading' ? 'Loading…' : 'Network error, please retry.')}
      </div>

      {status === 'error' && onRetry && (
        <button type="button" className="temp-content__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export default TempContent
