import { apiRequest } from './client'
import type { DashboardSummary } from '../types/dashboard'

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>('/api/dashboard/summary')
}
