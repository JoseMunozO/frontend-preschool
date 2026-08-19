export type MaterialStatus = 'ACTIVE' | 'ARCHIVED'

export type MaterialItem = {
  materialId: number
  sku?: string
  name: string
  category?: string
  unit?: string
  quantityOnHand: number
  minimumQuantity?: number
  lowStock: boolean
  status: MaterialStatus
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type MaterialRequest = {
  sku?: string
  name: string
  category?: string
  unit?: string
  quantityOnHand: number
  minimumQuantity: number
  status?: MaterialStatus
  notes?: string
}

export type MaterialMovementType = 'IN' | 'OUT' | 'ADJUSTMENT'

export type MaterialMovement = {
  materialMovementId: number
  materialId: number
  materialName: string
  movementType: MaterialMovementType
  quantity: number
  movementDate?: string
  performedByUserId?: number
  performedByEmail?: string
  notes?: string
  createdAt?: string
}

export type MaterialMovementRequest = {
  movementType: MaterialMovementType
  quantity: number
  notes?: string
}
