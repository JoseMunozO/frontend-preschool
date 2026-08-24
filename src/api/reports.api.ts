import { apiRequest } from './client'
import type { TrashEntry } from '../types/reports'

export function getTrash() {
  return apiRequest<TrashEntry[]>('/api/reports/trash')
}
