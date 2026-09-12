import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../components/ProfileActivity', () => ({ default: () => <div data-testid="profile-activity" /> }))
vi.mock('../components/ProfileFollowSection', () => ({ default: () => <div data-testid="follow-section" /> }))
vi.mock('../components/ChangelogPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="changelog-panel">
      <button type="button" onClick={onClose}>close-changelog</button>
    </div>
  ),
}))

import { useAuth } from '../contexts/AuthContext'
import Profile from './Profile'
import type { AppUser } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: bob,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Profile', () => {
  it('shows the signed-in user\'s username and email', () => {
    renderProfile()
    expect(screen.getByText('@bob')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders ProfileActivity for the signed-in user', () => {
    renderProfile()
    expect(screen.getByTestId('profile-activity')).toBeInTheDocument()
  })

  it('keeps Year in review / Public view / Sign out tucked behind a More menu until opened', () => {
    renderProfile()
    expect(screen.queryByText('Public view')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('More'))
    expect(screen.getByText('Year in review')).toBeInTheDocument()
    expect(screen.getByText('Public view')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('links Public view to the profile route', () => {
    renderProfile()
    fireEvent.click(screen.getByText('More'))
    expect(screen.getByText('Public view')).toHaveAttribute('href', '/u/bob')
  })

  it('renders the More menu as a floating overlay, not an inline block', () => {
    renderProfile()
    fireEvent.click(screen.getByText('More'))
    expect(screen.getByText('Public view').closest('[role="dialog"]')).toHaveClass('absolute')
  })

  it('has no header title or close button inside the menu -- just the trigger and its items', () => {
    renderProfile()
    fireEvent.click(screen.getByText('More'))
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('closes the More menu on an outside pointerdown', () => {
    renderProfile()
    fireEvent.click(screen.getByText('More'))
    expect(screen.getByText('Public view')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText('Public view')).not.toBeInTheDocument()
  })

  it('calls signOut when Sign out is clicked, and closes the menu', () => {
    const signOut = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      user: bob,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut,
    })
    renderProfile()
    fireEvent.click(screen.getByText('More'))
    fireEvent.click(screen.getByText('Sign out'))
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })

  it('toggles the changelog panel open and closed', () => {
    renderProfile()
    expect(screen.queryByTestId('changelog-panel')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/What's new/))
    expect(screen.getByTestId('changelog-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByText('close-changelog'))
    expect(screen.queryByTestId('changelog-panel')).not.toBeInTheDocument()
  })
})
