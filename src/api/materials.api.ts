import { apiRequest } from './client'
import type {
  MaterialItem,
  MaterialMovement,
  MaterialMovementReportEntry,
  MaterialMovementRequest,
  MaterialRequest,
  MaterialStatus,
} from '../types/materials'

type GetMaterialsParams = {
  search?: string
  category?: string
  status?: MaterialStatus | 'ALL'
  lowStock?: boolean
  includeDeleted?: boolean
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

  if (params.includeDeleted) {
    searchParams.set('includeDeleted', 'true')
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<MaterialItem[]>(`/api/materials${query}`)
}

export function getLowStockMaterials() {
  return apiRequest<MaterialItem[]>('/api/materials/low-stock')
}

export function createMaterial(request: MaterialRequest) {
  return apiRequest<MaterialItem>('/api/materials', {
    method: 'POST',
    body: request,
  })
}

export function updateMaterial(materialId: number, request: MaterialRequest) {
  return apiRequest<MaterialItem>(`/api/materials/${materialId}`, {
    method: 'PUT',
    body: request,
  })
}

export function createMaterialMovement(materialId: number, request: MaterialMovementRequest) {
  return apiRequest<MaterialMovement>(`/api/materials/${materialId}/movements`, {
    method: 'POST',
    body: request,
  })
}

export function deleteMaterial(materialId: number) {
  return apiRequest<void>(`/api/materials/${materialId}`, {
    method: 'DELETE',
  })
}

export function restoreMaterial(materialId: number) {
  return apiRequest<MaterialItem>(`/api/materials/${materialId}/restore`, {
    method: 'POST',
  })
}

type GetMaterialMovementsReportParams = {
  materialId?: number
  from?: string
  to?: string
  type?: 'IN' | 'OUT'
}

export function getMaterialMovementsReport(params: GetMaterialMovementsReportParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.materialId) {
    searchParams.set('materialId', String(params.materialId))
  }

  if (params.from) {
    searchParams.set('from', params.from)
  }

  if (params.to) {
    searchParams.set('to', params.to)
  }

  if (params.type) {
    searchParams.set('type', params.type)
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<MaterialMovementReportEntry[]>(`/api/materials/reports/movements${query}`)
}
