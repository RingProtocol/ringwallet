import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'

interface ReceiveDialogProps {
  address: string
  chainName: string
  onClose: () => void
}

const qrCodeDataUrlCache = new Map<string, string>()

const ReceiveDialog: React.FC<ReceiveDialogProps> = ({
  address,
  chainName,
  onClose,
}) => {
  const { t } = useI18n()
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(
    qrCodeDataUrlCache.get(address) ?? null
  )
  const [isQrLoading, setIsQrLoading] = useState(
    !qrCodeDataUrlCache.has(address)
  )

  useEffect(() => {
    let active = true
    const cached = qrCodeDataUrlCache.get(address)
    if (cached) {
      setQrCodeSrc(cached)
      setIsQrLoading(false)
      return () => {
        active = false
      }
    }

    const loadQrCode = async () => {
      try {
        setIsQrLoading(true)
        const dataUrl = await QRCode.toDataURL(address, {
          width: 150,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
        if (!active) {
          return
        }
        qrCodeDataUrlCache.set(address, dataUrl)
        setQrCodeSrc(dataUrl)
      } catch {
        if (!active) {
          return
        }
        setQrCodeSrc(null)
      } finally {
        if (active) {
          setIsQrLoading(false)
        }
      }
    }

    loadQrCode()
    return () => {
      active = false
    }
  }, [address])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    alert(t('copiedToClipboard'))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--receive"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Receive Address</h3>
        <div className="qr-placeholder">
          <div className="qr-image-shell">
            {isQrLoading && <div className="qr-loading" aria-hidden="true" />}
            {qrCodeSrc && (
              <img
                src={qrCodeSrc}
                alt="Wallet Address QR"
                className="qr-image"
              />
            )}
          </div>
        </div>
        <p className="qr-chain-name">{chainName}</p>
        <p className="address-display">{address}</p>
        <div className="modal-actions">
          <button onClick={copyToClipboard} className="primary-btn">
            Copy Address
          </button>
          <button onClick={onClose} className="secondary-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReceiveDialog
