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

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

export type PaymentAllocationRequest = {
  studentChargeId: number
  amountAllocated: number
}

export type PaymentRequest = {
  paymentDate: string
  totalAmount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string
  notes?: string
  allocations: PaymentAllocationRequest[]
}

export type PaymentAllocation = {
  paymentAllocationId: number
  studentChargeId: number
  studentId: number
  studentName: string
  amountAllocated: number
  createdAt?: string
}

export type Payment = {
  paymentId: number
  parentId?: number
  parentName?: string
  receivedByStaffId?: number
  receivedByStaffName?: string
  paymentDate: string
  totalAmount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  allocations: PaymentAllocation[]
}
