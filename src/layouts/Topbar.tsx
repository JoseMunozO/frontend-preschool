import { LogOut } from 'lucide-react'
import { useAuthStore } from '../auth/auth.store'

export function Topbar() {
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Panel interno</p>
        <h1>Administracion del preescolar</h1>
      </div>
      <div className="topbar-user">
        <span>{session?.user.name ?? session?.user.email}</span>
        <button className="icon-button" onClick={logout} title="Cerrar sesion" type="button">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
