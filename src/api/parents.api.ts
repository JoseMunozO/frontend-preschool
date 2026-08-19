import { apiRequest } from './client'
import type { ParentListItem, ParentRequest } from '../types/parents'

export function getParents() {
  return apiRequest<ParentListItem[]>('/api/parents')
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
