import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/ThemeContext', () => ({ useTheme: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/bugReport', () => ({ submitBugReport: vi.fn() }))
vi.mock('../lib/changelog', () => ({ appVersion: '1.2.3' }))
vi.mock('../components/ProfileActivity', () => ({ default: () => <div data-testid="profile-activity" /> }))
vi.mock('../components/ProfileFollowSection', () => ({ default: () => <div data-testid="follow-section" /> }))

import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import Profile from './Profile'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({
    theme: 'dark',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
    transparency: 'system',
    setTransparency: vi.fn(),
  })
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

/** Opens the panel and waits for it, since Profile's openAfterMenuCloses opens it a tick late. */
async function openBugReport() {
  fireEvent.click(screen.getByText('More'))
  fireEvent.click(screen.getByText('Report a bug'))
  return screen.findByRole('dialog', { name: 'Report a bug' })
}

describe('Profile + real ReportBugPanel', () => {
  it('keeps the bug-report modal open when clicking into its own title field', async () => {
    renderProfile()
    await openBugReport()

    fireEvent.pointerDown(screen.getByLabelText('Bug title'))
    fireEvent.click(screen.getByLabelText('Bug title'))

    expect(screen.getByRole('dialog', { name: 'Report a bug' })).toBeInTheDocument()
  })

  it('still closes the modal via its own Cancel button', async () => {
    renderProfile()
    await openBugReport()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('dialog', { name: 'Report a bug' })).not.toBeInTheDocument()
  })
})
