import { NavLink } from 'react-router-dom'
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
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/students', label: 'Estudiantes', icon: GraduationCap },
  { to: '/parents', label: 'Padres / Tutores', icon: UsersRound },
  { to: '/payments', label: 'Pagos', icon: CreditCard, roles: financeRoles },
  { to: '/materials', label: 'Material Escolar', icon: Boxes },
  { to: '/schedules', label: 'Horarios', icon: CalendarDays },
  { to: '/attendance', label: 'Asistencia', icon: ClipboardList },
  { to: '/staff', label: 'Personal', icon: UserCog, roles: adminRoles },
  { to: '/reports', label: 'Reportes', icon: FileText },
  { to: '/settings', label: 'Configuracion', icon: Settings },
]

export function Sidebar() {
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const visibleNavItems = navItems.filter((item) => !item.roles || hasAnyRole(item.roles))

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark-small" aria-hidden="true">
          <BarChart3 size={18} />
        </span>
        <span>Mi Preescolar</span>
      </div>
      <nav className="sidebar-nav" aria-label="Principal">
        {visibleNavItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink className="nav-link" end={item.to === '/'} key={item.to} to={item.to}>
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="sidebar-account">
        <span className="avatar" aria-hidden="true" />
        <div>
          <strong>Administrador</strong>
          <span>admin@preescolar.com</span>
        </div>
      </div>
    </aside>
  )
}
