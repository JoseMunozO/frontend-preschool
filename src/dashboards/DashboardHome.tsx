import { useAuthStore } from '../auth/auth.store'
import { adminRoles, financeRoles } from '../auth/roleAccess'
import { AdminDashboard } from './AdminDashboard'
import { TeacherDashboard } from './TeacherDashboard'

export function DashboardHome() {
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const isTeacherOnly = !hasAnyRole(adminRoles) && !hasAnyRole(financeRoles) && hasAnyRole(['TEACHER'])

  return isTeacherOnly ? <TeacherDashboard /> : <AdminDashboard />
}
