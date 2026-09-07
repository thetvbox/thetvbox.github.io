import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true }))

import { useAuth } from '../contexts/AuthContext'
import Login from './Login'
import type { AppUser } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue(authValue())
})

describe('Login', () => {
  it('redirects to /home when already signed in', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: bob }))
    renderLogin()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it('shows the email step first', () => {
    renderLogin()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('rejects an invalid email without calling findByEmail', async () => {
    const findByEmail = vi.fn()
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } })
    fireEvent.submit(screen.getByLabelText('Email address').closest('form')!)
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(findByEmail).not.toHaveBeenCalled()
  })

  it('signs in directly when the email matches an existing user', async () => {
    const signIn = vi.fn()
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockResolvedValue(bob), signIn }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bob@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(bob))
  })

  it('advances to the username step for a new email', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockResolvedValue(null) }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByPlaceholderText('username')).toBeInTheDocument())
  })

  it('shows an error when the email lookup fails', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockRejectedValue(new Error('network down')) }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bob@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
  })

  it('rejects an invalid username without calling register', async () => {
    const register = vi.fn()
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockResolvedValue(null), register }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByPlaceholderText('username')
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'a' } })
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByText(/Username must be/)).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('registers a valid username', async () => {
    const register = vi.fn().mockResolvedValue(bob)
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockResolvedValue(null), register }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByPlaceholderText('username')
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'newbob' } })
    fireEvent.click(screen.getByText('Create account'))
    await waitFor(() => expect(register).toHaveBeenCalledWith('new@example.com', 'newbob'))
  })

  it('shows a registration error', async () => {
    vi.mocked(useAuth).mockReturnValue(
      authValue({ findByEmail: vi.fn().mockResolvedValue(null), register: vi.fn().mockRejectedValue(new Error('taken')) }),
    )
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByPlaceholderText('username')
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'newbob' } })
    fireEvent.click(screen.getByText('Create account'))
    await waitFor(() => expect(screen.getByText('taken')).toBeInTheDocument())
  })

  it('goes back to the email step from the username step', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ findByEmail: vi.fn().mockResolvedValue(null) }))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByPlaceholderText('username')
    fireEvent.click(screen.getByText(/Use a different email/))
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })
})
