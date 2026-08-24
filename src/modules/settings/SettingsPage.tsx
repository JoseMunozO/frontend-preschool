import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../../theme/theme.store'
import type { ThemePreference } from '../../theme/theme.store'
import type { SupportedLanguage } from '../../i18n/i18n'

const languageOptions: { value: SupportedLanguage; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
]

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  const themeOptions: { value: ThemePreference; label: string; description: string }[] = [
    { value: 'system', label: t('settings.themeSystem'), description: t('settings.themeSystemDescription') },
    { value: 'light', label: t('settings.themeLight'), description: t('settings.themeLightDescription') },
    { value: 'dark', label: t('settings.themeDark'), description: t('settings.themeDarkDescription') },
  ]

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">{t('common.module')}</p>
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.description')}</p>
      </section>

      <article className="panel">
        <h3>{t('settings.languageTitle')}</h3>
        <p>{t('settings.languageDescription')}</p>
        <div className="entity-form-grid">
          {languageOptions.map((option) => (
            <label className="checkbox-field" key={option.value}>
              <input
                checked={i18n.resolvedLanguage === option.value}
                name="language"
                onChange={() => void i18n.changeLanguage(option.value)}
                type="radio"
                value={option.value}
              />
              <strong>{option.label}</strong>
            </label>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>{t('settings.themeTitle')}</h3>
        <p>{t('settings.themeDescription')}</p>
        <div className="entity-form-grid">
          {themeOptions.map((option) => (
            <label className="checkbox-field" key={option.value}>
              <input
                checked={theme === option.value}
                name="theme"
                onChange={() => setTheme(option.value)}
                type="radio"
                value={option.value}
              />
              <span>
                <strong>{option.label}</strong>
                <br />
                <span className="field-hint">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </article>
    </main>
  )
}
