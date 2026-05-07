import { apiRequest } from './client'
import type { StudentCharge } from '../types/payments'

export function getStudentCharges(month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiRequest<StudentCharge[]>(`/api/payments/charges${query}`)
}
