import { apiRequest } from './client'
import type {
  Payment,
  PaymentChargeStatus,
  PaymentRequest,
  StudentCharge,
  StudentChargeRequest,
} from '../types/payments'

type GetStudentChargesParams = {
  month?: string
  status?: PaymentChargeStatus | 'ALL'
}

export function getStudentCharges(params: GetStudentChargesParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.month) {
    searchParams.set('month', params.month)
  }

  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status)
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<StudentCharge[]>(`/api/payments/charges${query}`)
}

export function createPayment(request: PaymentRequest) {
  return apiRequest('/api/payments', {
    method: 'POST',
    body: request,
  })
}

export function getPaymentsByStudent(studentId: number) {
  return apiRequest<Payment[]>(`/api/payments/students/${studentId}`)
}

export function updateCharge(studentChargeId: number, request: StudentChargeRequest) {
  return apiRequest<StudentCharge>(`/api/payments/charges/${studentChargeId}`, {
    method: 'PUT',
    body: request,
  })
}
