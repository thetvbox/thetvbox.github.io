import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/notifications', () => ({
  clearAllNotifications: vi.fn(),
  fetchNotifications: vi.fn(),
  fetchUnseenNotificationCount: vi.fn(),
  markNotificationsSeenAndPrune: vi.fn(),
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

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    user_id: 'u1',
    actor_id: 'u2',
    actor_username: 'bob',
    type: 'follow',
    show_id: null,
    show_name: null,
    show_poster_path: null,
    rating: null,
    episode_count: null,
    created_at: '2026-01-01T00:00:00Z',
    seen_at: null,
    ...overrides,
  }
}

function renderBell(open = false, onOpenChange = vi.fn()) {
  return render(
    <MemoryRouter>
      <NotificationsBell open={open} onOpenChange={onOpenChange} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchUnseenNotificationCount).mockReset().mockResolvedValue(0)
  vi.mocked(fetchNotifications).mockReset().mockResolvedValue([])
  vi.mocked(markNotificationsSeenAndPrune).mockReset().mockResolvedValue(undefined)
  vi.mocked(clearAllNotifications).mockReset().mockResolvedValue(undefined)
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
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
    const { container } = renderBell()
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an unseen-count badge once fetched', async () => {
    vi.mocked(fetchUnseenNotificationCount).mockResolvedValue(3)
    renderBell()
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByLabelText('Notifications, 3 new')).toBeInTheDocument()
  })

  it('caps the displayed badge at 9+', async () => {
    vi.mocked(fetchUnseenNotificationCount).mockResolvedValue(15)
    renderBell()
    await waitFor(() => expect(screen.getByText('9+')).toBeInTheDocument())
  })

  it('calls onOpenChange when the bell is clicked', () => {
    const onOpenChange = vi.fn()
    renderBell(false, onOpenChange)
    fireEvent.click(screen.getByLabelText('Notifications'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('loads and renders notifications when open', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([notification({ actor_username: 'bob' })])
    renderBell(true)
    await waitFor(() => expect(screen.getByText(/started following you/)).toBeInTheDocument())
    expect(markNotificationsSeenAndPrune).toHaveBeenCalledWith('u1')
  })

  it('shows an empty state with no notifications', async () => {
    renderBell(true)
    await waitFor(() => expect(screen.getByText(/Nothing yet/)).toBeInTheDocument())
  })

  it('shows an error message if loading fails', async () => {
    vi.mocked(fetchNotifications).mockRejectedValue(new Error('load failed'))
    renderBell(true)
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('clears all notifications when Clear all is clicked', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([notification()])
    renderBell(true)
    await waitFor(() => expect(screen.getByText('Clear all')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Clear all'))
    await waitFor(() => expect(screen.getByText(/Nothing yet/)).toBeInTheDocument())
    expect(clearAllNotifications).toHaveBeenCalledWith('u1')
  })

  it('closes on Escape', () => {
    const onOpenChange = vi.fn()
    renderBell(true, onOpenChange)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders show-rated notification text with the rating', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      notification({ type: 'show_rated', show_name: 'Show One', rating: 4.5 }),
    ])
    renderBell(true)
    await waitFor(() => expect(screen.getByText(/rated/)).toBeInTheDocument())
    expect(screen.getByText(/4\.5★/)).toBeInTheDocument()
  })

  it('renders show-finished notification text with episode count', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      notification({ type: 'show_finished', show_name: 'Show One', episode_count: 12 }),
    ])
    renderBell(true)
    await waitFor(() => expect(screen.getByText(/finished/)).toBeInTheDocument())
    expect(screen.getByText(/12 episodes/)).toBeInTheDocument()
  })
})
