import { apiRequest, apiRequestBlob } from './client'
import type {
  ChargeDiscountRequest,
  ChargeType,
  Payment,
  PaymentChargeStatus,
  PaymentMonthlyReport,
  PaymentRequest,
  StudentCharge,
  StudentChargeRequest,
} from '../types/payments'

type GetStudentChargesParams = {
  studentId?: number
  month?: string
  status?: PaymentChargeStatus | 'ALL'
  hasDiscount?: boolean
}

export function getStudentCharges(params: GetStudentChargesParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.studentId) {
    searchParams.set('studentId', String(params.studentId))
  }

  if (params.month) {
    searchParams.set('month', params.month)
  }

  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status)
  }

  if (params.hasDiscount !== undefined) {
    searchParams.set('hasDiscount', String(params.hasDiscount))
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

export function getPaymentReceipt(paymentId: number) {
  return apiRequestBlob(`/api/payments/${paymentId}/receipt`)
}

export function updateCharge(studentChargeId: number, request: StudentChargeRequest) {
  return apiRequest<StudentCharge>(`/api/payments/charges/${studentChargeId}`, {
    method: 'PUT',
    body: request,
  })
}

export function createCharge(request: StudentChargeRequest) {
  return apiRequest<StudentCharge>('/api/payments/charges', {
    method: 'POST',
    body: request,
  })
}

export function getChargeTypes(params: { activeOnly?: boolean } = {}) {
  const searchParams = new URLSearchParams()

  if (params.activeOnly) {
    searchParams.set('activeOnly', 'true')
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<ChargeType[]>(`/api/payments/charge-types${query}`)
}

export function applyChargeDiscount(studentChargeId: number, request: ChargeDiscountRequest) {
  return apiRequest<StudentCharge>(`/api/payments/charges/${studentChargeId}/discount`, {
    method: 'PUT',
    body: request,
  })
}

export function removeChargeDiscount(studentChargeId: number) {
  return apiRequest<StudentCharge>(`/api/payments/charges/${studentChargeId}/discount`, {
    method: 'DELETE',
  })
}

export function getMonthlyPaymentsReport(month?: string) {
  const query = month ? `?month=${month}` : ''
  return apiRequest<PaymentMonthlyReport>(`/api/payments/reports/monthly${query}`)
}
