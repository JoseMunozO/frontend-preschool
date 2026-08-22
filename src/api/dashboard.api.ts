import { apiRequest } from './client'
import type { DashboardSummary, TeacherDashboardSummary } from '../types/dashboard'

export function getDashboardSummary() {
  return apiRequest<DashboardSummary>('/api/dashboard/summary')
}

export function getTeacherDashboardSummary() {
  return apiRequest<TeacherDashboardSummary>('/api/dashboard/teacher-summary')
}
