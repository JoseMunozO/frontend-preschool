export type PaymentChargeStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL'

export type StudentCharge = {
  id: number | string
  studentId?: number | string
  studentName?: string
  month?: string
  status?: PaymentChargeStatus
  amount?: number
  pendingBalance?: number
}
