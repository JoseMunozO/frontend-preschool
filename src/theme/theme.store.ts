import { create } from 'zustand'

export type ThemePreference = 'light' | 'dark' | 'system'

const storageKey = 'preschool.theme'

type ThemeState = {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

function applyTheme(theme: ThemePreference) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = theme
  }
}

function readInitialTheme(): ThemePreference {
  const stored = localStorage.getItem(storageKey)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

const initialTheme = readInitialTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    localStorage.setItem(storageKey, theme)
    applyTheme(theme)
    set({ theme })
  },
}))
