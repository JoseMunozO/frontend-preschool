export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type ScheduleItem = {
  scheduleSlotId: number
  groupId: number
  groupName: string
  primaryStaffId?: number
  primaryStaffName?: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  activityTitle: string
  roomName?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type ScheduleRequest = {
  groupId: number
  primaryStaffId?: number
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  activityTitle: string
  roomName?: string
  notes?: string
}
