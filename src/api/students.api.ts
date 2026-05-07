import { apiRequest } from './client'

export type StudentListItem = {
  studentId: number
  studentCode?: string
  firstName: string
  lastName: string
  profilePhotoUrl?: string
  birthDate: string
  groupId?: number
  groupName?: string
  status: 'active' | 'inactive' | 'pending' | 'graduated'
  enrollmentDate?: string
  withdrawalDate?: string
  medicalNotes?: string
  allergies?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type StudentGuardian = {
  studentId: number
  studentName: string
  parentId: number
  parentName: string
  relationshipType: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'RELATIVE' | 'OTHER'
  primaryContact: boolean
  billingContact: boolean
  authorizedPickup: boolean
  livesWithStudent: boolean
  createdAt?: string
  updatedAt?: string
}

export function getStudents() {
  return apiRequest<StudentListItem[]>('/api/students')
}

export function getStudentGuardians(studentId: number) {
  return apiRequest<StudentGuardian[]>(`/api/students/${studentId}/guardians`)
}
