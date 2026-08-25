import { useAuthStore } from '../auth/auth.store'
import { adminRoles } from '../auth/roleAccess'
import { AdminDashboard } from './AdminDashboard'
import { FinanceDashboard } from './FinanceDashboard'
import { TeacherDashboard } from './TeacherDashboard'

export function DashboardHome() {
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const isAdmin = hasAnyRole(adminRoles)
  const isFinanceOnly = !isAdmin && hasAnyRole(['FINANCE'])
  const isTeacherOnly = !isAdmin && !isFinanceOnly && hasAnyRole(['TEACHER'])

  if (isFinanceOnly) {
    return <FinanceDashboard />
  }

  return isTeacherOnly ? <TeacherDashboard /> : <AdminDashboard />
}
