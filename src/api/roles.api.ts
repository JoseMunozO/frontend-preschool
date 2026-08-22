import { apiRequest } from './client'

export type RoleCode = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'TEACHER' | 'FINANCE' | 'PARENT'

export type Role = {
  roleId: number
  code: RoleCode
  name: string
  description: string
  rankLevel: number
  createdAt?: string
}

export function getRoles() {
  return apiRequest<Role[]>('/api/roles')
}
