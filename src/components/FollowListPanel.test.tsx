import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useFollowActions', () => ({ useFollowActions: vi.fn() }))
vi.mock('../lib/follows', () => ({
  fetchFollowerIds: vi.fn(),
  fetchFollowersWithUsers: vi.fn(),
  fetchFollowingIds: vi.fn(),
  fetchFollowingWithUsers: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { useFollowActions } from '../hooks/useFollowActions'
import { fetchFollowerIds, fetchFollowersWithUsers, fetchFollowingIds, fetchFollowingWithUsers } from '../lib/follows'
import FollowListPanel from './FollowListPanel'
import type { AppUser } from '../types'

const me: AppUser = { id: 'me1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const bob: AppUser = { id: 'bob1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function renderPanel(mode: 'followers' | 'following' = 'followers', onClose = vi.fn(), onMyFollowingCountChange?: (d: number) => void) {
  return render(
    <MemoryRouter>
      <FollowListPanel userId="target1" mode={mode} onClose={onClose} onMyFollowingCountChange={onMyFollowingCountChange} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
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

describe('FollowListPanel', () => {
  it('shows the Followers title and fetches followers in followers mode', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([bob])
    renderPanel('followers')
    expect(screen.getByText('Followers')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
    expect(fetchFollowersWithUsers).toHaveBeenCalledWith('target1')
  })

  it('shows the Following title and fetches following in following mode', async () => {
    vi.mocked(fetchFollowingWithUsers).mockResolvedValue([bob])
    renderPanel('following')
    expect(screen.getByText('Following')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
  })

  it('shows an empty-followers message', async () => {
    renderPanel('followers')
    await waitFor(() => expect(screen.getByText('No followers yet.')).toBeInTheDocument())
  })

  it('shows an empty-following message', async () => {
    renderPanel('following')
    await waitFor(() => expect(screen.getByText('Not following anyone yet.')).toBeInTheDocument())
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchFollowersWithUsers).mockRejectedValue(new Error('load failed'))
    renderPanel('followers')
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('shows a "Follows you" badge for people who follow me', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([bob])
    vi.mocked(fetchFollowerIds).mockResolvedValue(new Set(['bob1']))
    renderPanel('followers')
    await waitFor(() => expect(screen.getByText('Follows you')).toBeInTheDocument())
  })

  it('does not show a follow button for myself in the list', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([me])
    renderPanel('followers')
    await waitFor(() => expect(screen.getByText('@me')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Follow|Unfollow/ })).not.toBeInTheDocument()
  })

  it('follows a person from the list', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([bob])
    const onMyFollowingCountChange = vi.fn()
    renderPanel('followers', vi.fn(), onMyFollowingCountChange)
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Follow'))
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
    expect(onMyFollowingCountChange).toHaveBeenCalledWith(1)
  })

  it('unfollows a person from the list', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([bob])
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['bob1']))
    const onMyFollowingCountChange = vi.fn()
    renderPanel('followers', vi.fn(), onMyFollowingCountChange)
    await waitFor(() => expect(screen.getByLabelText('Unfollow')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Unfollow'))
    await waitFor(() => expect(screen.getByLabelText('Follow')).toBeInTheDocument())
    expect(onMyFollowingCountChange).toHaveBeenCalledWith(-1)
  })

  it('clicking a row link calls onClose', async () => {
    vi.mocked(fetchFollowersWithUsers).mockResolvedValue([bob])
    const onClose = vi.fn()
    renderPanel('followers', onClose)
    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@bob'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    renderPanel('followers', onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
