export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'FINANCE'
  | 'HR'
  | 'TEACHER'
  | 'ASSISTANT_TEACHER'
  | 'PARENT'
  | 'GUARDIAN'
  | 'AUDITOR'

export type AuthUser = {
  id?: number | string
  email: string
  name?: string
  roles: UserRole[]
}

export type AuthSession = {
  token: string
  user: AuthUser
}

export type LoginRequest = {
  email: string
  password: string
}
