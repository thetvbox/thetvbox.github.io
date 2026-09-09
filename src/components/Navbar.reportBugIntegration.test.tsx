import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

// Regression test for a real bug: ReportBugButton renders its panel through the shared Modal,
// which portals to document.body -- outside the Navbar wrapper div that used to gate the
// dropdown's own "click outside closes it" listener. Unlike Navbar.test.tsx, this file keeps
// ReportBugButton and Modal real (only mocking their leaf dependencies) so a click that lands
// on the portaled dialog is exercised exactly as it would be in the browser.
vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/ThemeContext', () => ({ useTheme: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/bugReport', () => ({ submitBugReport: vi.fn() }))
vi.mock('../lib/changelog', () => ({ appVersion: '1.2.3' }))
vi.mock('./NotificationsBell', () => ({ default: () => null }))

import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggleTheme: vi.fn(), setTheme: vi.fn() })
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar + real ReportBugButton', () => {
  it('keeps the bug-report modal open when clicking into its own title field', () => {
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Report a bug'))
    expect(screen.getByRole('dialog', { name: 'Report a bug' })).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByLabelText('Bug title'))
    fireEvent.click(screen.getByLabelText('Bug title'))

    expect(screen.getByRole('dialog', { name: 'Report a bug' })).toBeInTheDocument()
  })

  it('still closes the modal via its own Cancel button', () => {
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Report a bug'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('dialog', { name: 'Report a bug' })).not.toBeInTheDocument()
  })
})
