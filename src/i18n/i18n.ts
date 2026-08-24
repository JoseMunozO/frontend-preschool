import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'
import sv from './locales/sv.json'

export const supportedLanguages = ['es', 'en', 'sv'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

const storageKey = 'preschool.language'

function readInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(storageKey)
  return supportedLanguages.includes(stored as SupportedLanguage) ? (stored as SupportedLanguage) : 'es'
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    sv: { translation: sv },
  },
  lng: readInitialLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem(storageKey, language)
})

export default i18n
