import { create } from 'zustand'
import { setApiAuthToken } from '../api/client'
import type { AuthSession } from '../types/auth'

const storageKey = 'preschool.auth.session'

type AuthState = {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  logout: () => void
  hasAnyRole: (roles: string[]) => boolean
}

function readInitialSession() {
  const rawSession = localStorage.getItem(storageKey)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

const initialSession = readInitialSession()
setApiAuthToken(initialSession?.token ?? null)

export const useAuthStore = create<AuthState>((set, get) => ({
  session: initialSession,
  setSession: (session) => {
    localStorage.setItem(storageKey, JSON.stringify(session))
    setApiAuthToken(session.token)
    set({ session })
  },
  logout: () => {
    localStorage.removeItem(storageKey)
    setApiAuthToken(null)
    set({ session: null })
  },
  hasAnyRole: (roles) => {
    const currentRoles = get().session?.user.roles ?? []
    return roles.some((role) => currentRoles.some((currentRole) => currentRole === role))
  },
}))
