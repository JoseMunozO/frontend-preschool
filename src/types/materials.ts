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
