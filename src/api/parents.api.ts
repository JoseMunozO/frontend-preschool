import { apiRequest } from './client'
import type { ParentListItem } from '../types/parents'

export function getParents() {
  return apiRequest<ParentListItem[]>('/api/parents')
}
