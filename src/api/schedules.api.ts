import { apiRequest } from './client'
import type { ScheduleItem } from '../types/schedules'

export function getSchedules() {
  return apiRequest<ScheduleItem[]>('/api/schedules')
}
