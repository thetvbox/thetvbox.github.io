import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./useFollowActions', () => ({ useFollowActions: vi.fn() }))

import { useFollowActions } from './useFollowActions'
import { useFollowToggles } from './useFollowToggles'

const follow = vi.fn(async (_id: string, onChange: (following: boolean) => void) => onChange(true))
const unfollow = vi.fn(async (_id: string, _name: string | undefined, onChange: (following: boolean) => void) =>
  onChange(false),
)

beforeEach(() => {
  follow.mockClear()
  unfollow.mockClear()
  vi.mocked(useFollowActions).mockReturnValue({ follow, unfollow, toast: null, dismiss: vi.fn() })
})

describe('useFollowToggles', () => {
  it('adds a followed person, reports the change, and clears the saving flag', async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowToggles(() => 'bob', onChange))
    await act(() => result.current.handleFollow('u2'))
    expect(result.current.followingIds.has('u2')).toBe(true)
    expect(result.current.savingIds.has('u2')).toBe(false)
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("passes the person's username to unfollow and removes them", async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFollowToggles((id) => (id === 'u2' ? 'bob' : undefined), onChange))
    act(() => result.current.setFollowingIds(new Set(['u2'])))
    await act(() => result.current.handleUnfollow('u2'))
    expect(unfollow).toHaveBeenCalledWith('u2', 'bob', expect.any(Function))
    expect(result.current.followingIds.has('u2')).toBe(false)
    expect(onChange).toHaveBeenCalledWith(-1)
  })
})
