import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useFollowActions', () => ({ useFollowActions: vi.fn() }))
vi.mock('../lib/follows', () => ({
  fetchFollowCounts: vi.fn(),
  isFollowingUser: vi.fn(),
  fetchFollowerIds: vi.fn(),
  fetchFollowersWithUsers: vi.fn(),
  fetchFollowingIds: vi.fn(),
  fetchFollowingWithUsers: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { useFollowActions } from '../hooks/useFollowActions'
import {
  fetchFollowCounts,
  fetchFollowerIds,
  fetchFollowersWithUsers,
  fetchFollowingIds,
  fetchFollowingWithUsers,
  isFollowingUser,
} from '../lib/follows'
import ProfileFollowSection from './ProfileFollowSection'
import type { AppUser } from '../types'

const me: AppUser = { id: 'me1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function renderSection(props: Partial<Parameters<typeof ProfileFollowSection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ProfileFollowSection profileId="target1" username="target" isMe={false} {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchFollowCounts).mockReset().mockResolvedValue({ followers: 5, following: 3 })
  vi.mocked(isFollowingUser).mockReset().mockResolvedValue(false)
  vi.mocked(fetchFollowersWithUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchFollowingWithUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchFollowingIds).mockReset().mockResolvedValue(new Set())
  vi.mocked(fetchFollowerIds).mockReset().mockResolvedValue(new Set())
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
  vi.mocked(useFollowActions).mockReturnValue({
    follow: vi.fn(async (_id: string, onChange: (f: boolean) => void) => onChange(true)),
    unfollow: vi.fn(async (_id: string, _u: string | undefined, onChange: (f: boolean) => void) => onChange(false)),
    toast: null,
    dismiss: vi.fn(),
  })
})

describe('ProfileFollowSection', () => {
  it('renders follower and following counts once loaded', async () => {
    renderSection()
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('followers')).toBeInTheDocument()
  })

  it('uses singular "follower" for a count of 1', async () => {
    vi.mocked(fetchFollowCounts).mockResolvedValue({ followers: 1, following: 0 })
    renderSection()
    await waitFor(() => expect(screen.getByText('follower')).toBeInTheDocument())
  })

  it('shows a Follow button for another user, not for my own profile', async () => {
    renderSection({ isMe: false })
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
  })

  it('hides the follow button on my own profile', async () => {
    renderSection({ isMe: true })
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.queryByLabelText('Follow')).not.toBeInTheDocument()
  })

  it('follows and bumps the follower count', async () => {
    renderSection({ isMe: false })
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Follow'))
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('unfollows and decrements the follower count', async () => {
    vi.mocked(isFollowingUser).mockResolvedValue(true)
    renderSection({ isMe: false })
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Unfollow'))
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('opens the followers panel when the followers count is clicked', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([])
    renderSection()
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    fireEvent.click(screen.getByText('5').closest('button')!)
    await waitFor(() => expect(screen.getByText('Followers')).toBeInTheDocument())
  })

  it('opens the following panel when the following count is clicked', async () => {
    vi.mocked(fetchFollowingWithUsers).mockResolvedValue([])
    renderSection()
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    fireEvent.click(screen.getByText('3').closest('button')!)
    await waitFor(() => expect(screen.getByText('Following')).toBeInTheDocument())
  })

  it('closes the panel and bumps the following count when following someone from my own following panel', async () => {
    vi.mocked(fetchFollowingWithUsers).mockResolvedValue([
      { id: 'x1', email: 'x@example.com', username: 'x', created_at: '2026-01-01T00:00:00Z' },
    ])
    renderSection({ isMe: true, profileId: 'me1' })
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    fireEvent.click(screen.getByText('3').closest('button')!)
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Follow'))
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument())
  })
})
