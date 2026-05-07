import { apiRequest } from './client'
import type { AuthSession, LoginRequest, UserRole } from '../types/auth'

type LoginResponse = Partial<AuthSession> & {
  accessToken?: string
  jwt?: string
  roles?: UserRole[]
  email?: string
  name?: string
  userId?: number | string
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: request,
  })

  const token = response.token ?? response.accessToken ?? response.jwt

  if (!token) {
    throw new Error('Login response did not include a JWT token')
  }

  const user = response.user ?? {
    id: response.userId,
    email: response.email ?? request.email,
    name: response.name,
    roles: response.roles ?? [],
  }

  return {
    token,
    user: {
      ...user,
      roles: user.roles ?? [],
    },
  }
}
