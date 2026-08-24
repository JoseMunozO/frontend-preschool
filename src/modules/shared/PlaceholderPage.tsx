import { useTranslation } from 'react-i18next'

type PlaceholderPageProps = {
  titleKey: string
  descriptionKey: string
}

export function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">{t('common.module')}</p>
        <h2>{t(titleKey)}</h2>
      </section>
      <article className="panel">
        <h3>{t('common.baseReady')}</h3>
        <p>{t(descriptionKey)}</p>
      </article>
    </main>
  )
}
