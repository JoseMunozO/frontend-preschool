import { apiRequest, apiRequestBlob } from './client'
import type {
  ChargeType,
  Payment,
  PaymentChargeStatus,
  PaymentMonthlyReport,
  PaymentRequest,
  StudentCharge,
  StudentChargeRequest,
  StudentDiscount,
  StudentDiscountRequest,
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

export function getStudentDiscounts(studentId: number) {
  return apiRequest<StudentDiscount[]>(`/api/payments/students/${studentId}/discounts`)
}

export function createDiscount(studentId: number, request: StudentDiscountRequest) {
  return apiRequest<StudentDiscount>(`/api/payments/students/${studentId}/discounts`, {
    method: 'POST',
    body: request,
  })
}

export function deactivateDiscount(studentId: number, discountId: number) {
  return apiRequest<StudentDiscount>(`/api/payments/students/${studentId}/discounts/${discountId}/deactivate`, {
    method: 'PATCH',
  })
}

export function getMonthlyPaymentsReport(month?: string) {
  const query = month ? `?month=${month}` : ''
  return apiRequest<PaymentMonthlyReport>(`/api/payments/reports/monthly${query}`)
}
