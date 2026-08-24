import { useTranslation } from 'react-i18next'

export function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">403</p>
        <h2>{t('forbidden.title')}</h2>
      </section>
      <article className="panel">
        <p>{t('forbidden.message')}</p>
      </article>
    </main>
  )
}
