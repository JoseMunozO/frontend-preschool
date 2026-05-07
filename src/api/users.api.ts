import { apiRequest } from './client'
import type { UserListItem } from '../types/users'

export function getUsers() {
  return apiRequest<UserListItem[]>('/api/users')
}
