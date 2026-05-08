export type ParentListItem = {
  parentId: number
  userId?: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  preferredLanguage?: string
  status: 'ACTIVE' | 'INACTIVE'
  notes?: string
  createdAt?: string
  updatedAt?: string
}
