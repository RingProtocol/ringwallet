import React, { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../../../../components/common/TitleBar'
import TempContent from '../../../../components/common/TempContent'
import { useI18n } from '../../../../i18n'
import '../Card.css'

interface Props {
  /** Human-readable provider name, shown in the page title. */
  providerName: string
  /**
   * KYC session URL once the provider has issued it; `null` while another
   * phase of the apply flow is running (status check, KYC start, or card
   * creation). `'about:blank'` is treated as a sandbox placeholder.
   */
  kycUrl: string | null
  /**
   * Text shown inside the TempContent loading state whenever no iframe is
   * being rendered. The parent (`CardApp`) picks the appropriate copy for
   * the current phase (checking existing cards, starting KYC, issuing card).
   */
  loadingMessage: string
  /** Fatal error message (apply failed or query failed). */
  error: string | null
  /** Back / dismiss handler — invoked by the TitleBar back button. */
  onBack: () => void
  /** Called when the embedded iframe fails to load. */
  onIframeError: (message: string) => void
  /** Called by the user to retry after a fatal error. */
  onRetry?: () => void
}

/**
 * `CardApplyPage` — standalone full-screen page for the apply-for-new-card
 * flow, conforming to {@link documents/specs/pages/page-style.md}:
 *  - **Header:** {@link TitleBar} with a back button.
 *  - **Content:** {@link TempContent} for loading/error, otherwise the
 *    provider's hosted KYC view.
 *
 * Lifecycle is owned by the parent (`CardApp`) — this component is a pure
 * presentation layer over the apply state. The portal mount mirrors the
 * `CardDashboardView` so the page covers the wallet shell when active.
 */
const CardApplyPage: React.FC<Props> = ({
  providerName,
  kycUrl,
  loadingMessage,
  error,
  onBack,
  onIframeError,
  onRetry,
}) => {
  const { t } = useI18n()
  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeError, setIframeError] = useState<string | null>(null)

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
    setIframeError(null)
  }, [])

  const handleIframeError = useCallback(() => {
    setIframeLoading(false)
    const message = t('cardKYCLoadError')
    setIframeError(message)
    onIframeError(message)
  }, [onIframeError, t])

  const isPlaceholder = kycUrl === 'about:blank'

  // ─── Body resolution ───────────────────────────────
  // Order:
  //   1. Fatal page-level error (e.g. apply failed) — show error TempContent.
  //   2. kycUrl === 'about:blank' (sandbox placeholder) — friendly waiting copy.
  //   3. kycUrl is a real URL — embedded iframe (with iframe-level loading overlay).
  //   4. iframe load error — local error TempContent with internal retry.
  //   5. kycUrl is null — generic loading copy from `loadingMessage`.
  let body: React.ReactNode

  if (error) {
    body = (
      <TempContent status="error" onRetry={onRetry}>
        {error}
      </TempContent>
    )
  } else if (isPlaceholder) {
    body = (
      <TempContent status="loading">
        <div className="card-apply-page__placeholder">
          <p className="card-apply-page__placeholder-title">
            {t('cardKYCPlaceholderTitle')}
          </p>
          <p className="card-apply-page__placeholder-desc">
            {t('cardKYCPlaceholderDesc')}
          </p>
        </div>
      </TempContent>
    )
  } else if (kycUrl) {
    if (iframeError) {
      body = (
        <TempContent
          status="error"
          onRetry={() => {
            setIframeLoading(true)
            setIframeError(null)
          }}
        >
          {iframeError}
        </TempContent>
      )
    } else {
      body = (
        <>
          {iframeLoading && (
            <TempContent status="loading">{t('cardKYCLoading')}</TempContent>
          )}
          <iframe
            className="card-apply-page__iframe"
            src={kycUrl}
            title={t('cardKYCTitle')}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          />
        </>
      )
    }
  } else {
    body = <TempContent status="loading">{loadingMessage}</TempContent>
  }

  const content = (
    <div className="card-apply-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span className="card-apply-page__title">
          {t('cardApplyTitle', { provider: providerName })}
        </span>
      </TitleBar>
      <div className="card-apply-page__content">{body}</div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default CardApplyPage
