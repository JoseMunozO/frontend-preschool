import { apiRequest } from './client'
import type { StudentGuardian } from './students.api'
import type { ParentListItem, ParentRequest } from '../types/parents'

export function getParents() {
  return apiRequest<ParentListItem[]>('/api/parents')
}

export function getParentStudents(parentId: number) {
  return apiRequest<StudentGuardian[]>(`/api/parents/${parentId}/students`)
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
