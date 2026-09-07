import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchAllUsers: vi.fn() }))
vi.mock('../lib/follows', () => ({
  fetchFollowerIds: vi.fn(),
  fetchFollowingIds: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { fetchAllUsers } from '../lib/users'
import { fetchFollowerIds, fetchFollowingIds, followUser, unfollowUser } from '../lib/follows'
import Members from './Members'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const bob: AppUser = { id: 'u2', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function renderMembers() {
  return render(
    <MemoryRouter>
      <Members />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchAllUsers).mockReset().mockResolvedValue([me, bob])
  vi.mocked(fetchFollowingIds).mockReset().mockResolvedValue(new Set())
  vi.mocked(fetchFollowerIds).mockReset().mockResolvedValue(new Set())
  vi.mocked(followUser)
    .mockReset()
    .mockResolvedValue({ id: 'f1', follower_id: 'u1', followed_id: 'u2', created_at: '2026-01-01T00:00:00Z' })
  vi.mocked(unfollowUser).mockReset().mockResolvedValue(undefined)
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Members', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchAllUsers).mockReturnValue(new Promise(() => {}))
    const { container } = renderMembers()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchAllUsers).mockRejectedValue(new Error('load failed'))
    renderMembers()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('shows a message when no one has registered', async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue([])
    renderMembers()
    await waitFor(() => expect(screen.getByText('No one has registered yet.')).toBeInTheDocument())
  })

  it('lists members with a "You" badge for yourself', async () => {
    renderMembers()
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('shows a "Follows you" badge for followers', async () => {
    vi.mocked(fetchFollowerIds).mockResolvedValue(new Set(['u2']))
    renderMembers()
    await waitFor(() => expect(screen.getByText(/Follows you/)).toBeInTheDocument())
  })

  it('filters by username via the search box', async () => {
    renderMembers()
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Find a username…'), { target: { value: 'zzz' } })
    await waitFor(() => expect(screen.getByText(/No one matches/)).toBeInTheDocument())
  })

  it('follows a member', async () => {
    renderMembers()
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Follow'))
    await waitFor(() => expect(followUser).toHaveBeenCalledWith('u1', 'u2'))
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
  })

  it('unfollows a member and offers undo', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    renderMembers()
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Unfollow'))
    await waitFor(() => expect(unfollowUser).toHaveBeenCalledWith('u1', 'u2'))
    expect(screen.getByText('Unfollowed @bob')).toBeInTheDocument()
  })

  it('does not show a follow button for yourself', async () => {
    renderMembers()
    await waitFor(() => expect(screen.getByText('@me')).toBeInTheDocument())
    expect(screen.queryAllByLabelText('Follow')).toHaveLength(1)
  })
})
