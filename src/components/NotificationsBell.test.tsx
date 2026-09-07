import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/notifications', () => ({
  fetchNotifications: vi.fn(),
  fetchUnseenNotificationCount: vi.fn(),
  markNotificationsSeenAndPrune: vi.fn(),
  clearAllNotifications: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import {
  clearAllNotifications,
  fetchNotifications,
  fetchUnseenNotificationCount,
  markNotificationsSeenAndPrune,
} from '../lib/notifications'
import NotificationsBell from './NotificationsBell'
import type { AppUser, Notification } from '../types'

const me: AppUser = { id: 'me1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    user_id: 'me1',
    actor_id: 'bob1',
    actor_username: 'bob',
    type: 'follow',
    show_id: null,
    show_name: null,
    show_poster_path: null,
    rating: null,
    episode_count: null,
    created_at: '2026-09-01T00:00:00Z',
    seen_at: null,
    ...overrides,
  }
}

function renderBell(open = true, onOpenChange = vi.fn()) {
  return render(
    <MemoryRouter>
      <NotificationsBell open={open} onOpenChange={onOpenChange} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
  vi.mocked(fetchNotifications).mockReset().mockResolvedValue([])
  vi.mocked(fetchUnseenNotificationCount).mockReset().mockResolvedValue(0)
  vi.mocked(markNotificationsSeenAndPrune).mockReset().mockResolvedValue(undefined)
  vi.mocked(clearAllNotifications).mockReset().mockResolvedValue(undefined)
})

describe('NotificationsBell', () => {
  it('renders nothing when signed out', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    const { container } = renderBell(false)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the unseen count badge and includes it in the accessible name', async () => {
    vi.mocked(fetchUnseenNotificationCount).mockResolvedValue(3)
    renderBell(false)
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByLabelText('Notifications, 3 new')).toBeInTheDocument()
  })

  it('caps the badge at "9+"', async () => {
    vi.mocked(fetchUnseenNotificationCount).mockResolvedValue(14)
    renderBell(false)
    await waitFor(() => expect(screen.getByText('9+')).toBeInTheDocument())
  })

  it('shows a friendly empty state when there is no activity', async () => {
    renderBell(true)
    await waitFor(() =>
      expect(screen.getByText('Nothing yet -- follow some people to see their activity here.')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
  })

  it('lists notifications and marks them seen on open', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      notification({ id: 'n1', type: 'follow' }),
      notification({
        id: 'n2',
        type: 'show_rated',
        actor_username: 'ana',
        show_id: 7,
        show_name: 'Severance',
        rating: 4.5,
      }),
    ])
    renderBell(true)
    await waitFor(() => expect(screen.getByText('started following you')).toBeInTheDocument())
    expect(screen.getByText('Severance')).toBeInTheDocument()
    expect(markNotificationsSeenAndPrune).toHaveBeenCalledWith('me1')
  })

  it('clears all notifications', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([notification()])
    renderBell(true)
    await waitFor(() => expect(screen.getByText('Clear all')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Clear all'))
    await waitFor(() => expect(clearAllNotifications).toHaveBeenCalledWith('me1'))
    await waitFor(() =>
      expect(screen.getByText('Nothing yet -- follow some people to see their activity here.')).toBeInTheDocument(),
    )
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchNotifications).mockRejectedValue(new Error('boom'))
    renderBell(true)
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('closes via the panel close button', async () => {
    const onOpenChange = vi.fn()
    renderBell(true, onOpenChange)
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    renderBell(true, onOpenChange)
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('toggles open on bell click', () => {
    const onOpenChange = vi.fn()
    renderBell(false, onOpenChange)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
