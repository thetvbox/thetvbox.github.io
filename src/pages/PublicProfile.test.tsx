import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchUserByUsername: vi.fn() }))
vi.mock('../components/ProfileActivity', () => ({ default: () => <div data-testid="profile-activity" /> }))
vi.mock('../components/ProfileFollowSection', () => ({ default: () => <div data-testid="follow-section" /> }))

import { useAuth } from '../contexts/AuthContext'
import { fetchUserByUsername } from '../lib/users'
import PublicProfile from './PublicProfile'
import type { AppUser } from '../types'

const me: AppUser = { id: 'me1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function renderProfile(username = 'bob') {
  return render(
    <MemoryRouter initialEntries={[`/u/${username}`]}>
      <Routes>
        <Route path="/u/:username" element={<PublicProfile />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchUserByUsername).mockReset()
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('PublicProfile', () => {
  it('shows a loading skeleton before the profile resolves', () => {
    vi.mocked(fetchUserByUsername).mockReturnValue(new Promise(() => {}))
    const { container } = renderProfile()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows the profile once loaded', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    renderProfile()
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
    expect(screen.getByTestId('profile-activity')).toBeInTheDocument()
  })

  it('shows a not-found message when no user matches', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(null)
    renderProfile('ghost')
    await waitFor(() => expect(screen.getByText(/No one found with username/)).toBeInTheDocument())
  })

  it('shows an error message when the fetch fails', async () => {
    vi.mocked(fetchUserByUsername).mockRejectedValue(new Error('load failed'))
    renderProfile()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('shows "This is you" and an edit link when viewing my own public profile', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(me)
    renderProfile('me')
    await waitFor(() => expect(screen.getByText('This is you')).toBeInTheDocument())
    expect(screen.getByText('Edit / sign out')).toHaveAttribute('href', '/profile')
  })

  it('shows "Member" and a compare link for someone else\'s profile', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    renderProfile('bob')
    await waitFor(() => expect(screen.getByText('Member')).toBeInTheDocument())
    expect(screen.getByText('Compare ratings')).toHaveAttribute('href', '/compare/bob')
  })
})
