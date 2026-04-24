import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Toast.css'

export interface ToastProps {
  message: string
  visible: boolean
  onClose: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  onClose,
  duration = 2000,
}) => {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [visible, duration, onClose])

  if (!visible) return null

  return createPortal(
    <div className="toast-overlay" role="status" aria-live="polite">
      <div className="toast-content">{message}</div>
    </div>,
    document.body
  )
}

export default Toast
