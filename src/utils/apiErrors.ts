import { ApiError } from '../api/client'

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}
