import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <p>Secret content</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading spinner while auth is resolving', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    const { container } = renderRoute()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('redirects to /login when signed out', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    renderRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children when signed in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: me,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    renderRoute()
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })
})
