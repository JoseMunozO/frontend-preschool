import { X } from 'lucide-react'

type UndoToastProps = {
  message: string
  actionLabel?: string
  isActing?: boolean
  onAction: () => void
  onDismiss: () => void
}

export function UndoToast({
  message,
  actionLabel = 'Deshacer',
  isActing = false,
  onAction,
  onDismiss,
}: UndoToastProps) {
  return (
    <div className="undo-toast" role="status">
      <span>{message}</span>
      <div className="undo-toast-actions">
        <button className="undo-toast-action" disabled={isActing} onClick={onAction} type="button">
          {isActing ? 'Restaurando...' : actionLabel}
        </button>
        <button
          aria-label="Cerrar aviso"
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
