import type { TFunction } from 'i18next'
import { z } from 'zod'

export function createScheduleFormSchema(t: TFunction) {
  return z
    .object({
      groupId: z.string().min(1, t('schedules.groupRequired')),
      primaryStaffId: z.string(),
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      startTime: z.string().min(1, t('schedules.startTimeRequired')),
      endTime: z.string().min(1, t('schedules.endTimeRequired')),
      activityTitle: z.string().trim().min(1, t('schedules.activityRequired')),
      roomName: z.string(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.startTime && values.endTime && values.startTime >= values.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: t('schedules.endTimeAfterStart'),
          path: ['endTime'],
        })
      }
    })
}

export type ScheduleFormValues = z.infer<ReturnType<typeof createScheduleFormSchema>>
