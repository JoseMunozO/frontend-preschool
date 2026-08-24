import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { adminRoles, financeRoles, internalRoles } from '../auth/roleAccess'
import { LoginPage } from '../auth/LoginPage'
import { DashboardHome } from '../dashboards/DashboardHome'
import { AppLayout } from '../layouts/AppLayout'
import { AttendancePage } from '../modules/attendance/AttendancePage'
import { MaterialsPage } from '../modules/materials/MaterialsPage'
import { ParentsPage } from '../modules/parents/ParentsPage'
import { PaymentsPage } from '../modules/payments/PaymentsPage'
import { SchedulesPage } from '../modules/schedules/SchedulesPage'
import { ReportsPage } from '../modules/reports/ReportsPage'
import { SettingsPage } from '../modules/settings/SettingsPage'
import { StaffPage } from '../modules/staff/StaffPage'
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
          {
            path: 'staff',
            element: <ProtectedRoute roles={adminRoles} />,
            children: [{ index: true, element: <StaffPage /> }],
          },
          { path: 'attendance', element: <AttendancePage /> },
          {
            path: 'reports',
            element: <ProtectedRoute roles={internalRoles} />,
            children: [{ index: true, element: <ReportsPage /> }],
          },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
