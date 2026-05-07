export type ScheduleItem = {
  id: number | string
  groupId?: number | string
  groupName?: string
  dayOfWeek?: string
  startTime?: string
  endTime?: string
  activityName?: string
  responsibleName?: string
}
