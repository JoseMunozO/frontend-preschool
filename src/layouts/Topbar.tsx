import { Bell, LogOut, Menu, UserCircle } from 'lucide-react'
import { useAuthStore } from '../auth/auth.store'

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)

  return (
    <header className="topbar">
      <button className="topbar-menu" onClick={onMenuClick} title="Menu" type="button">
        <Menu size={20} aria-hidden="true" />
      </button>
      <div className="topbar-user">
        <button className="icon-button" title="Notificaciones" type="button">
          <Bell size={18} aria-hidden="true" />
        </button>
        <span>{session?.user.name ?? session?.user.email}</span>
        <UserCircle size={30} aria-hidden="true" />
        <button className="icon-button" onClick={logout} title="Cerrar sesion" type="button">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
