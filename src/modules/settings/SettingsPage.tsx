import { useThemeStore } from '../../theme/theme.store'
import type { ThemePreference } from '../../theme/theme.store'

const themeOptions: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'Automatico', description: 'Sigue la preferencia del sistema operativo del dispositivo.' },
  { value: 'light', label: 'Claro', description: 'Usa siempre el tema claro, sin importar el sistema.' },
  { value: 'dark', label: 'Oscuro', description: 'Usa siempre el tema oscuro, sin importar el sistema.' },
]

export function SettingsPage() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">Modulo</p>
        <h2>Configuracion</h2>
        <p>Preferencias generales de la aplicacion para este dispositivo.</p>
      </section>

      <article className="panel">
        <h3>Tema</h3>
        <p>Elige como se ve la aplicacion en este dispositivo.</p>
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
