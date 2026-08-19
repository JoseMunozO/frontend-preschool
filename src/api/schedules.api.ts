import { apiRequest } from './client'
import type { DayOfWeek, ScheduleItem, ScheduleRequest } from '../types/schedules'

type GetSchedulesParams = {
  dayOfWeek?: DayOfWeek | 'ALL'
  groupId?: number | string
}

export function getSchedules(params: GetSchedulesParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.groupId) {
    searchParams.set('groupId', String(params.groupId))
  }

  if (params.dayOfWeek && params.dayOfWeek !== 'ALL') {
    searchParams.set('dayOfWeek', params.dayOfWeek)
  }

  const query = searchParams.toString()

  return apiRequest<ScheduleItem[]>(`/api/schedules${query ? `?${query}` : ''}`)
}

export function createSchedule(request: ScheduleRequest) {
  return apiRequest<ScheduleItem>('/api/schedules', {
    method: 'POST',
    body: request,
  })
}

export function updateSchedule(scheduleSlotId: number, request: ScheduleRequest) {
  return apiRequest<ScheduleItem>(`/api/schedules/${scheduleSlotId}`, {
    method: 'PUT',
    body: request,
  })
}
