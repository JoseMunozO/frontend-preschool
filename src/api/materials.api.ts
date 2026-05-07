import { apiRequest } from './client'
import type { MaterialItem } from '../types/materials'

export function getMaterials() {
  return apiRequest<MaterialItem[]>('/api/materials')
}

export function getLowStockMaterials() {
  return apiRequest<MaterialItem[]>('/api/materials?lowStock=true')
}
