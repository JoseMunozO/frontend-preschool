import { RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type TrashPanelProps<T> = {
  title: string
  items: T[]
  isLoading?: boolean
  getId: (item: T) => number
  getLabel: (item: T) => string
  getDeletedAt: (item: T) => string | null | undefined
  restoringId?: number | null
  onRestore: (item: T) => void
  onClose: () => void
  emptyMessage?: string
}

export function TrashPanel<T>({
  title,
  items,
  isLoading = false,
  getId,
  getLabel,
  getDeletedAt,
  restoringId,
  onRestore,
  onClose,
  emptyMessage,
}: TrashPanelProps<T>) {
  const { t, i18n } = useTranslation()

  function formatDeletedAt(value: string | null | undefined) {
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  return (
    <section className="panel trash-panel" aria-labelledby="trash-panel-title">
      <header className="form-panel-heading">
        <div>
          <h3 id="trash-panel-title">{title}</h3>
          <p>{t('common.trashSubtitle')}</p>
        </div>
        <button aria-label={t('common.closeTrash')} className="icon-button" onClick={onClose} type="button">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {isLoading ? <p>{t('common.loading')}</p> : null}

      {!isLoading && items.length === 0 ? <p>{emptyMessage}</p> : null}

      {!isLoading && items.length > 0 ? (
        <ul className="trash-list">
          {items.map((item) => {
            const id = getId(item)
            const isRestoring = restoringId === id

            return (
              <li className="trash-list-item" key={id}>
                <div>
                  <strong>{getLabel(item)}</strong>
                  <span className="field-hint">
                    {t('common.deletedOn', { date: formatDeletedAt(getDeletedAt(item)) })}
                  </span>
                </div>
                <button
                  className="secondary-button"
                  disabled={isRestoring}
                  onClick={() => onRestore(item)}
                  type="button"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  {isRestoring ? t('common.restoring') : t('common.restore')}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
