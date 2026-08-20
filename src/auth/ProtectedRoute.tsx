import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ForbiddenPage } from '../modules/shared/ForbiddenPage'
import { useAuthStore } from './auth.store'

type ProtectedRouteProps = {
  roles?: string[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation()
  const session = useAuthStore((state) => state.session)
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && roles.length > 0 && !hasAnyRole(roles)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
