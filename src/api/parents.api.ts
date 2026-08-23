import { apiRequest } from './client'
import type { StudentGuardian } from './students.api'
import type { ParentListItem, ParentRequest } from '../types/parents'

type GetParentsParams = {
  includeDeleted?: boolean
}

export function getParents(params: GetParentsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.includeDeleted) {
    searchParams.set('includeDeleted', 'true')
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<ParentListItem[]>(`/api/parents${query}`)
}

export function getParentStudents(parentId: number) {
  return apiRequest<StudentGuardian[]>(`/api/parents/${parentId}/students`)
}

export type StudentGuardianRequest = {
  studentId: number
  relationshipType: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'RELATIVE' | 'OTHER'
  primaryContact?: boolean
  billingContact?: boolean
  authorizedPickup?: boolean
  livesWithStudent?: boolean
}

export function linkStudentToParent(parentId: number, request: StudentGuardianRequest) {
  return apiRequest<StudentGuardian>(`/api/parents/${parentId}/students`, {
    method: 'POST',
    body: request,
  })
}

export function unlinkStudentFromParent(parentId: number, studentId: number) {
  return apiRequest<void>(`/api/parents/${parentId}/students/${studentId}`, {
    method: 'DELETE',
  })
}

export function createParent(request: ParentRequest) {
  return apiRequest<ParentListItem>('/api/parents', {
    method: 'POST',
    body: request,
  })
}

export function updateParent(parentId: number, request: ParentRequest) {
  return apiRequest<ParentListItem>(`/api/parents/${parentId}`, {
    method: 'PUT',
    body: request,
  })
}

export function activateParent(parentId: number) {
  return apiRequest<ParentListItem>(`/api/parents/${parentId}/activate`, {
    method: 'PATCH',
  })
}

export function deactivateParent(parentId: number) {
  return apiRequest<ParentListItem>(`/api/parents/${parentId}/deactivate`, {
    method: 'PATCH',
  })
}

export function deleteParent(parentId: number) {
  return apiRequest<void>(`/api/parents/${parentId}`, {
    method: 'DELETE',
  })
}

export function restoreParent(parentId: number) {
  return apiRequest<ParentListItem>(`/api/parents/${parentId}/restore`, {
    method: 'POST',
  })
}

export function claimParent(parentId: number, request: ParentRequest) {
  return apiRequest<ParentListItem>(`/api/parents/${parentId}/claim`, {
    method: 'POST',
    body: request,
  })
}
