import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/follows', () => ({ followUser: vi.fn(), unfollowUser: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { followUser, unfollowUser } from '../lib/follows'
import { useFollowActions } from './useFollowActions'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

beforeEach(() => {
  vi.mocked(followUser).mockReset().mockResolvedValue({} as never)
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

describe('useFollowActions', () => {
  it('follow: optimistically flips to following and persists', async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.follow('target1', onChange))
    expect(onChange).toHaveBeenNthCalledWith(1, true)
    expect(followUser).toHaveBeenCalledWith('u1', 'target1')
  })

  it('follow: rolls back and shows an error toast on failure', async () => {
    vi.mocked(followUser).mockRejectedValue(new Error('boom'))
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.follow('target1', onChange))
    expect(onChange).toHaveBeenNthCalledWith(2, false)
    expect(result.current.toast).toMatchObject({ tone: 'error' })
  })

  it('follow: does nothing when signed out', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.follow('target1', onChange))
    expect(onChange).not.toHaveBeenCalled()
    expect(followUser).not.toHaveBeenCalled()
  })

  it('unfollow: optimistically flips to not-following, persists, and offers undo', async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', 'bob', onChange))
    expect(onChange).toHaveBeenNthCalledWith(1, false)
    expect(unfollowUser).toHaveBeenCalledWith('u1', 'target1')
    expect(result.current.toast).toMatchObject({ message: 'Unfollowed @bob', tone: 'info' })
  })

  it('unfollow: falls back to a generic message with no username', async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', undefined, onChange))
    expect(result.current.toast?.message).toBe('Unfollowed')
  })

  it('unfollow: rolls back and shows an error toast on failure, without an undo offer', async () => {
    vi.mocked(unfollowUser).mockRejectedValue(new Error('boom'))
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', 'bob', onChange))
    expect(onChange).toHaveBeenNthCalledWith(2, true)
    expect(result.current.toast).toMatchObject({ tone: 'error' })
  })

  it("unfollow's undo action re-follows on click", async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', 'bob', onChange))
    await act(() => result.current.toast?.action?.onClick())
    expect(onChange).toHaveBeenNthCalledWith(2, true)
    expect(followUser).toHaveBeenCalledWith('u1', 'target1')
  })

  it("unfollow's undo action rolls back and shows an error if re-following fails", async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', 'bob', onChange))
    vi.mocked(followUser).mockRejectedValue(new Error('boom'))
    await act(() => result.current.toast?.action?.onClick())
    expect(onChange).toHaveBeenNthCalledWith(3, false)
  })

  it('dismiss clears the toast', async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowActions())
    await act(() => result.current.unfollow('target1', 'bob', onChange))
    act(() => result.current.dismiss())
    expect(result.current.toast).toBeNull()
  })
})
