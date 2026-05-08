export type PaymentChargeStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'OVERDUE'

export type StudentCharge = {
  studentChargeId: number
  studentId: number
  studentName: string
  chargeTypeId: number
  chargeTypeCode?: string
  chargeTypeName: string
  dueDate: string
  billingPeriodStart?: string
  billingPeriodEnd?: string
  amountDue: number
  amountPaid: number
  balance: number
  status: PaymentChargeStatus
  description?: string
  createdAt?: string
  updatedAt?: string
}
