import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  Settings,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { useAuthStore } from '../auth/auth.store'
import { adminRoles, financeRoles } from '../auth/roleAccess'

const navItems = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/students', labelKey: 'nav.students', icon: GraduationCap },
  { to: '/parents', labelKey: 'nav.parents', icon: UsersRound },
  { to: '/payments', labelKey: 'nav.payments', icon: CreditCard, roles: financeRoles },
  { to: '/materials', labelKey: 'nav.materials', icon: Boxes },
  { to: '/schedules', labelKey: 'nav.schedules', icon: CalendarDays },
  { to: '/attendance', labelKey: 'nav.attendance', icon: ClipboardList },
  { to: '/staff', labelKey: 'nav.staff', icon: UserCog, roles: adminRoles },
  { to: '/reports', labelKey: 'nav.reports', icon: FileText, roles: financeRoles },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

type SidebarProps = {
  isOpen: boolean
  onNavigate: () => void
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const visibleNavItems = navItems.filter((item) => !item.roles || hasAnyRole(item.roles))

  return (
    <aside className={isOpen ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="sidebar-brand">
        <span className="brand-mark-small" aria-hidden="true">
          <BarChart3 size={18} />
        </span>
        <span>{t('nav.brand')}</span>
      </div>
      <nav className="sidebar-nav" aria-label="Principal">
        {visibleNavItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink className="nav-link" end={item.to === '/'} key={item.to} onClick={onNavigate} to={item.to}>
              <Icon size={17} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="sidebar-account">
        <span className="avatar" aria-hidden="true" />
        <div>
          <strong>{t('nav.accountRole')}</strong>
          <span>{t('nav.accountEmail')}</span>
        </div>
      </div>
    </aside>
  )
}
