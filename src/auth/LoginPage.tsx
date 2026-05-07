import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { login } from '../api/auth.api'
import { useAuthStore } from './auth.store'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const [email, setEmail] = useState('admin@school.com')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  const locationState = location.state as LocationState | null
  const redirectTo = locationState?.from?.pathname ?? '/'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const nextSession = await login({ email, password })
      setSession(nextSession)
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark">
          <LockKeyhole size={22} aria-hidden="true" />
        </div>
        <h1 id="login-title">Preschool Admin</h1>
        <p>Acceso interno para administracion, direccion y equipo del centro.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label>
            Contrasena
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
