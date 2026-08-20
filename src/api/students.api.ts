

import { apiRequest } from './client'

export type StudentStatus = 'active' | 'inactive' | 'pending' | 'graduated'

export type StudentListItem = {
  studentId: number
  studentCode?: string
  firstName: string
  lastName: string
  profilePhotoUrl?: string
  birthDate: string
  groupId?: number
  groupName?: string
  primaryGuardianName?: string
  status: StudentStatus
  enrollmentDate?: string
  withdrawalDate?: string
  medicalNotes?: string
  allergies?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type StudentRequest = {
  studentCode?: string
  firstName: string
  lastName: string
  birthDate: string
  groupId?: number
  status: StudentStatus
  enrollmentDate: string
  withdrawalDate?: string
  medicalNotes?: string
  allergies?: string
  notes?: string
}

export type StudentGuardian = {
  studentId: number
  studentName: string
  parentId: number
  parentName: string
  relationshipType: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'RELATIVE' | 'OTHER'
  primaryContact: boolean
  billingContact: boolean
  authorizedPickup: boolean
  livesWithStudent: boolean
  createdAt?: string
  updatedAt?: string
}

type GetStudentsParams = {
  search?: string
  groupId?: number | string
  status?: StudentStatus | 'ALL'
}

export function getStudents(params: GetStudentsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.groupId) {
    searchParams.set('groupId', String(params.groupId))
  }

  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status)
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<StudentListItem[]>(`/api/students${query}`)
}

export function getStudentGuardians(studentId: number) {
  return apiRequest<StudentGuardian[]>(`/api/students/${studentId}/guardians`)
}

export function createStudent(request: StudentRequest) {
  return apiRequest<StudentListItem>('/api/students', {
    method: 'POST',
    body: request,
  })
}

export function updateStudent(studentId: number, request: StudentRequest) {
  return apiRequest<StudentListItem>(`/api/students/${studentId}`, {
    method: 'PUT',
    body: request,
  })
}
