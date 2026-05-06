import React from 'react'
import './TitleBar.css'

export interface TitleBarProps {
  onBack: () => void
  backLabel?: string
  children?: React.ReactNode
  right?: React.ReactNode
}

const TitleBar: React.FC<TitleBarProps> = ({
  onBack,
  backLabel = 'Back',
  children,
  right,
}) => {
  return (
    <header className="title-bar">
      <button
        type="button"
        className="title-bar__back"
        onClick={onBack}
        aria-label={backLabel}
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
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      {children && <div className="title-bar__content">{children}</div>}
      {right && <div className="title-bar__right">{right}</div>}
    </header>
  )
}

export default TitleBar
