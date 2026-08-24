import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { useAuthStore } from './auth.store'
import { login } from '../api/auth.api'

vi.mock('../api/auth.api', () => ({
  login: vi.fn(),
}))

const loginMock = vi.mocked(login)

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<div>Dashboard Home</div>} path="/" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ session: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('logs in and navigates to the dashboard on success', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({
      token: 'fake-token',
      user: { id: 1, email: 'admin@school.com', name: 'Admin', roles: ['ADMIN'] },
    })

    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument()
    })

    expect(useAuthStore.getState().session?.token).toBe('fake-token')
  })

  it('shows an error message and stays on the form when login fails', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValue(new Error('Credenciales invalidas'))

    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
