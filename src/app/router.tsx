import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { LoginPage } from '../auth/LoginPage'
import { AdminDashboard } from '../dashboards/AdminDashboard'
import { AppLayout } from '../layouts/AppLayout'
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
          { index: true, element: <AdminDashboard /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'parents', element: <ParentsPage /> },
          { path: 'payments', element: <PaymentsPage /> },
          { path: 'materials', element: <MaterialsPage /> },
          { path: 'schedules', element: <SchedulesPage /> },
          {
            path: 'attendance',
            element: (
              <PlaceholderPage
                description="Registro diario de asistencia por grupo y estudiante."
                title="Asistencia"
              />
            ),
          },
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
