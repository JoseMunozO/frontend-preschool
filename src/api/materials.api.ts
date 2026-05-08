import { apiRequest } from './client'
import type { MaterialItem, MaterialStatus } from '../types/materials'

type GetMaterialsParams = {
  search?: string
  category?: string
  status?: MaterialStatus | 'ALL'
  lowStock?: boolean
}

export function getMaterials(params: GetMaterialsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.category) {
    searchParams.set('category', params.category)
  }

  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status)
  }

  if (params.lowStock !== undefined) {
    searchParams.set('lowStock', String(params.lowStock))
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<MaterialItem[]>(`/api/materials${query}`)
}

export function getLowStockMaterials() {
  return apiRequest<MaterialItem[]>('/api/materials/low-stock')
}
