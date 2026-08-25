import { apiRequest } from './client'
import type { DashboardFinanceSummary, DashboardSummary, TeacherDashboardSummary } from '../types/dashboard'

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>('/api/dashboard/summary')
}

export function getTeacherDashboardSummary() {
  return apiRequest<TeacherDashboardSummary>('/api/dashboard/teacher-summary')
}

export function getFinanceDashboardSummary() {
  return apiRequest<DashboardFinanceSummary>('/api/dashboard/finance-summary')
}
