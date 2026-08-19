export type ParentStatus = 'ACTIVE' | 'INACTIVE'

export type ParentListItem = {
  parentId: number
  userId?: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  preferredLanguage?: string
  status: ParentStatus
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type ParentRequest = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  preferredLanguage?: string
  status?: ParentStatus
  notes?: string
  password?: string
}
