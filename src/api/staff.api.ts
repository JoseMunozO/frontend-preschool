import { apiRequest } from './client'
import type { Role, RoleCode } from './roles.api'

export type StaffStatus = 'active' | 'inactive'

export type StaffMember = {
  staffId: number
  userId?: number | null
  employeeCode?: string | null
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  positionTitle?: string | null
  staffType?: string | null
  hireDate?: string | null
  status: StaffStatus
  notes?: string | null
  roles: Role[]
  createdAt?: string
  updatedAt?: string
}

export type StaffRequest = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  employeeCode?: string
  positionTitle?: string
  staffType?: string
  hireDate?: string
  password?: string
  roles?: RoleCode[]
}

export function getStaffList() {
  return apiRequest<StaffMember[]>('/api/staff')
}

export function createStaff(request: StaffRequest) {
  return apiRequest<StaffMember>('/api/staff', {
    method: 'POST',
    body: request,
  })
}

export function assignRole(userId: number, role: RoleCode) {
  return apiRequest<void>(`/api/users/${userId}/roles`, {
    method: 'POST',
    body: { role },
  })
}

export function removeRole(userId: number, role: RoleCode) {
  return apiRequest<void>(`/api/users/${userId}/roles`, {
    method: 'DELETE',
    body: { role },
  })
}
