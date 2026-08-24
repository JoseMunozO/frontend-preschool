import { Bell, LogOut, Menu, UserCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../auth/auth.store'

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { t } = useTranslation()
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)

  return (
    <header className="topbar">
      <button className="topbar-menu" onClick={onMenuClick} title={t('topbar.menu')} type="button">
        <Menu size={20} aria-hidden="true" />
      </button>
      <div className="topbar-user">
        <button className="icon-button" title={t('topbar.notifications')} type="button">
          <Bell size={18} aria-hidden="true" />
        </button>
        <span>{session?.user.name ?? session?.user.email}</span>
        <UserCircle size={30} aria-hidden="true" />
        <button className="icon-button" onClick={logout} title={t('topbar.logout')} type="button">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
