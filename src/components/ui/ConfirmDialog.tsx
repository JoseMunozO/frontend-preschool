import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  if (!open) {
    return null
  }

  return (
    <div className="dialog-overlay" onClick={onCancel} role="presentation">
      <div
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="dialog-panel"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p id="confirm-dialog-description">{description}</p>
        <footer className="form-actions">
          <button className="secondary-button" disabled={isConfirming} onClick={onCancel} type="button">
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            className={variant === 'danger' ? 'danger-button' : 'primary-button'}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? t('common.processing') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </footer>
      </div>
    </div>
  )
}
