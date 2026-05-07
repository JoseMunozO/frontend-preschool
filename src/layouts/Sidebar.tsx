import { NavLink } from 'react-router-dom'
import {
  Boxes,
  CalendarDays,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  UsersRound,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Estudiantes', icon: GraduationCap },
  { to: '/parents', label: 'Padres', icon: UsersRound },
  { to: '/payments', label: 'Pagos', icon: CreditCard },
  { to: '/materials', label: 'Materiales', icon: Boxes },
  { to: '/schedules', label: 'Horarios', icon: CalendarDays },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot" aria-hidden="true" />
        <span>Preschool Admin</span>
      </div>
      <nav className="sidebar-nav" aria-label="Principal">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink className="nav-link" end={item.to === '/'} key={item.to} to={item.to}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
