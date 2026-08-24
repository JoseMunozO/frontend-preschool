import type { TFunction } from 'i18next'
import { z } from 'zod'

export function createStudentFormSchema(t: TFunction) {
  return z
    .object({
      studentCode: z.string(),
      firstName: z.string().trim().min(1, t('students.firstNameRequired')),
      lastName: z.string().trim().min(1, t('students.lastNameRequired')),
      birthDate: z.string().min(1, t('students.birthDateRequired')),
      groupId: z.string(),
      status: z.enum(['active', 'inactive', 'pending', 'graduated']),
      enrollmentDate: z.string().min(1, t('students.enrollmentDateRequired')),
      withdrawalDate: z.string(),
      medicalNotes: z.string(),
      allergies: z.string(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.birthDate && values.enrollmentDate && values.birthDate > values.enrollmentDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('students.enrollmentAfterBirth'),
          path: ['enrollmentDate'],
        })
      }

      if (values.withdrawalDate && values.enrollmentDate && values.withdrawalDate < values.enrollmentDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('students.withdrawalAfterEnrollment'),
          path: ['withdrawalDate'],
        })
      }
    })
}

export type StudentFormValues = z.infer<ReturnType<typeof createStudentFormSchema>>
