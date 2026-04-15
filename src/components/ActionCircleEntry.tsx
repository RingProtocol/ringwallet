import React from 'react'
import './ActionCircleEntry.css'

export interface ActionCircleEntryProps {
  icon: React.ReactNode
  label: string
  variantClass: string
  onClick: () => void
  disabled?: boolean
  title?: string
  testId?: string
}

export const ActionCircleEntry: React.FC<ActionCircleEntryProps> = ({
  icon,
  label,
  variantClass,
  onClick,
  disabled,
  title,
  testId,
}) => (
  <button
    type="button"
    className={`action-circle-entry ${variantClass}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    data-testid={testId}
  >
    <span className="action-circle-entry__disc" aria-hidden>
      {icon}
    </span>
    <span className="action-circle-entry__label">{label}</span>
  </button>
)
