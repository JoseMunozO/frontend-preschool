import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { createScheduleFormSchema } from './schedules.schema'

const t = ((key: string) => key) as TFunction

const validValues = {
  groupId: '1',
  primaryStaffId: '2',
  dayOfWeek: 'MONDAY' as const,
  startTime: '09:00',
  endTime: '10:00',
  activityTitle: 'Asamblea matutina',
  roomName: 'Aula Girasol',
  notes: '',
}

describe('createScheduleFormSchema', () => {
  it('accepts a valid set of values', () => {
    const result = createScheduleFormSchema(t).safeParse(validValues)
    expect(result.success).toBe(true)
  })

  it('rejects an end time equal to the start time', () => {
    const result = createScheduleFormSchema(t).safeParse({
      ...validValues,
      startTime: '09:00',
      endTime: '09:00',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join('.') === 'endTime')
      expect(issue?.message).toBe('schedules.endTimeAfterStart')
    }
  })

  it('rejects an end time before the start time', () => {
    const result = createScheduleFormSchema(t).safeParse({
      ...validValues,
      startTime: '10:00',
      endTime: '09:00',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join('.') === 'endTime')
      expect(issue?.message).toBe('schedules.endTimeAfterStart')
    }
  })

  it('requires groupId, startTime, endTime, and activityTitle', () => {
    const result = createScheduleFormSchema(t).safeParse({
      ...validValues,
      groupId: '',
      startTime: '',
      endTime: '',
      activityTitle: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((entry) => entry.path.join('.'))
      expect(paths).toEqual(expect.arrayContaining(['groupId', 'startTime', 'endTime', 'activityTitle']))
    }
  })
})
