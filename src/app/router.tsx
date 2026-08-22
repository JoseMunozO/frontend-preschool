import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { financeRoles } from '../auth/roleAccess'
import { LoginPage } from '../auth/LoginPage'
import { DashboardHome } from '../dashboards/DashboardHome'
import { AppLayout } from '../layouts/AppLayout'
import { AttendancePage } from '../modules/attendance/AttendancePage'
import { MaterialsPage } from '../modules/materials/MaterialsPage'
import { ParentsPage } from '../modules/parents/ParentsPage'
import { PaymentsPage } from '../modules/payments/PaymentsPage'
import { SchedulesPage } from '../modules/schedules/SchedulesPage'
import { PlaceholderPage } from '../modules/shared/PlaceholderPage'
import { StudentsPage } from '../modules/students/StudentsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'parents', element: <ParentsPage /> },
          {
            path: 'payments',
            element: <ProtectedRoute roles={financeRoles} />,
            children: [{ index: true, element: <PaymentsPage /> }],
          },
          { path: 'materials', element: <MaterialsPage /> },
          { path: 'schedules', element: <SchedulesPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          {
            path: 'reports',
            element: (
              <PlaceholderPage
                description="Reportes administrativos, financieros y operativos."
                title="Reportes"
              />
            ),
          },
          {
            path: 'settings',
            element: (
              <PlaceholderPage
                description="Configuracion general del centro, usuarios y preferencias."
                title="Configuracion"
              />
            ),
          },
        ],
      },
    ],
  },
])
