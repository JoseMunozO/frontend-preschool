import { apiRequest } from './client'

export type StudentListItem = {
  id: number | string
  firstName?: string
  lastName?: string
  fullName?: string
  status?: string
  groupName?: string
  groupId?: number | string
}

export function getStudents() {
  return apiRequest<StudentListItem[]>('/api/students')
}
