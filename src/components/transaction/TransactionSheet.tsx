import React from 'react'
import { createPortal } from 'react-dom'
import '../QuickActionBar.css'

interface TransactionSheetProps {
  children: React.ReactNode
  variant?: 'modal' | 'sheet' | 'fullscreen'
  contentClassName?: string
}

const TransactionSheet: React.FC<TransactionSheetProps> = ({
  children,
  variant = 'modal',
  contentClassName,
}) => {
  const content = (
    <div
      className={[
        'modal-overlay',
        variant === 'sheet' ? 'modal-overlay--sheet' : '',
        variant === 'fullscreen' ? 'modal-overlay--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'modal-content',
          variant === 'sheet' ? 'modal-content--sheet' : '',
          variant === 'fullscreen' ? 'modal-content--fullscreen' : '',
          contentClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }

  return createPortal(content, document.body)
}

export default TransactionSheet
