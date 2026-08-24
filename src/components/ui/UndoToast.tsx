import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type UndoToastProps = {
  message: string
  actionLabel?: string
  isActing?: boolean
  onAction: () => void
  onDismiss: () => void
}

export function UndoToast({ message, actionLabel, isActing = false, onAction, onDismiss }: UndoToastProps) {
  const { t } = useTranslation()

  return (
    <div className="undo-toast" role="status">
      <span>{message}</span>
      <div className="undo-toast-actions">
        <button className="undo-toast-action" disabled={isActing} onClick={onAction} type="button">
          {isActing ? t('common.restoring') : (actionLabel ?? t('common.undo'))}
        </button>
        <button
          aria-label={t('common.closeNotice')}
          className="undo-toast-close"
          disabled={isActing}
          onClick={onDismiss}
          type="button"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
