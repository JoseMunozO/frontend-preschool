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

export type StudentChargeRequest = {
  studentId: number
  chargeTypeId: number
  dueDate: string
  billingPeriodStart?: string
  billingPeriodEnd?: string
  amountDue: number
  status?: PaymentChargeStatus
  description?: string
}

export type ChargeTypeRecurrence = 'ONE_TIME' | 'MONTHLY' | 'CUSTOM'

export type ChargeType = {
  chargeTypeId: number
  code: string
  name: string
  recurrenceType: ChargeTypeRecurrence
  defaultAmount: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export type StudentDiscount = {
  studentDiscountId: number
  studentId: number
  studentName: string
  discountType: DiscountType
  value: number
  reason: string
  validFrom: string
  validUntil?: string
  active: boolean
  createdByUserId?: number
  createdByEmail?: string
  createdAt?: string
  updatedAt?: string
}

export type StudentDiscountRequest = {
  discountType: DiscountType
  value: number
  reason: string
  validFrom: string
  validUntil?: string
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
