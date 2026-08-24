import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { createStudentFormSchema } from './students.schema'

const t = ((key: string) => key) as TFunction

const validValues = {
  studentCode: 'STU-001',
  firstName: 'Lucas',
  lastName: 'Andersson',
  birthDate: '2020-04-12',
  groupId: '1',
  status: 'active' as const,
  enrollmentDate: '2024-01-15',
  withdrawalDate: '',
  medicalNotes: '',
  allergies: '',
  notes: '',
}

describe('createStudentFormSchema', () => {
  it('accepts a valid set of values', () => {
    const result = createStudentFormSchema(t).safeParse(validValues)
    expect(result.success).toBe(true)
  })

  it('rejects an enrollment date before the birth date', () => {
    const result = createStudentFormSchema(t).safeParse({
      ...validValues,
      birthDate: '2024-06-01',
      enrollmentDate: '2024-01-15',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join('.') === 'enrollmentDate')
      expect(issue?.message).toBe('students.enrollmentAfterBirth')
    }
  })

  it('rejects a withdrawal date before the enrollment date', () => {
    const result = createStudentFormSchema(t).safeParse({
      ...validValues,
      enrollmentDate: '2024-06-01',
      withdrawalDate: '2024-01-15',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join('.') === 'withdrawalDate')
      expect(issue?.message).toBe('students.withdrawalAfterEnrollment')
    }
  })

  it('requires firstName, lastName, birthDate, and enrollmentDate', () => {
    const result = createStudentFormSchema(t).safeParse({
      ...validValues,
      firstName: '',
      lastName: '',
      birthDate: '',
      enrollmentDate: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((entry) => entry.path.join('.'))
      expect(paths).toEqual(
        expect.arrayContaining(['firstName', 'lastName', 'birthDate', 'enrollmentDate']),
      )
    }
  })
})
