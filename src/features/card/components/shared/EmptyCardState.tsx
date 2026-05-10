import React from 'react'

interface Props {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

const EmptyCardState: React.FC<Props> = ({
  title = 'No Data',
  description = 'There is nothing to display yet.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-card-state">
      <div className="empty-card-state__icon" aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      </div>
      <h3 className="empty-card-state__title">{title}</h3>
      {description && (
        <p className="empty-card-state__description">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          className="empty-card-state__action"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyCardState
