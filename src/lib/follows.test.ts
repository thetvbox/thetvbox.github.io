import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  fetchAllFollows,
  fetchFollowCounts,
  fetchFollowerIds,
  fetchFollowersWithUsers,
  fetchFollowingIds,
  fetchFollowingWithUsers,
  followUser,
  isFollowingUser,
  unfollowUser,
} from './follows'
import type { AppUser, Follow } from '../types'

function follow(overrides: Partial<Follow> = {}): Follow {
  return { id: 'f1', follower_id: 'u1', followed_id: 'u2', created_at: '2026-01-01T00:00:00Z', ...overrides }
}

function user(overrides: Partial<AppUser> = {}): AppUser {
  return { id: 'u2', email: 'b@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z', ...overrides }
}

/** Queues up a sequence of query-builder results for successive supabase.from() calls. */
function queueFrom(...results: Parameters<typeof createQueryBuilder>[0][]) {
  const builders = results.map(createQueryBuilder)
  const from = vi.mocked(supabase.from)
  builders.forEach((b) => from.mockImplementationOnce(() => b as never))
  return builders
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchFollowingIds / fetchFollowerIds', () => {
  it('returns a set of the followed_id column', async () => {
    queueFrom({ data: [{ followed_id: 'a' }, { followed_id: 'b' }] })
    expect(await fetchFollowingIds('u1')).toEqual(new Set(['a', 'b']))
  })

  it('returns a set of the follower_id column', async () => {
    queueFrom({ data: [{ follower_id: 'a' }] })
    expect(await fetchFollowerIds('u1')).toEqual(new Set(['a']))
  })

  it('throws on a Supabase error', async () => {
    queueFrom({ error: new Error('boom') })
    await expect(fetchFollowingIds('u1')).rejects.toThrow('boom')
  })
})

describe('isFollowingUser', () => {
  it('returns true when a follow row exists', async () => {
    queueFrom({ data: { id: 'f1' } })
    expect(await isFollowingUser('u1', 'u2')).toBe(true)
  })

  it('returns false when no follow row exists', async () => {
    queueFrom({ data: null })
    expect(await isFollowingUser('u1', 'u2')).toBe(false)
  })
})

describe('fetchFollowCounts', () => {
  it('returns followers and following counts from parallel queries', async () => {
    queueFrom({ count: 3 }, { count: 5 })
    expect(await fetchFollowCounts('u1')).toEqual({ followers: 3, following: 5 })
  })

  it('defaults missing counts to zero', async () => {
    queueFrom({ count: null }, { count: null })
    expect(await fetchFollowCounts('u1')).toEqual({ followers: 0, following: 0 })
  })

  it('throws if the followers query errors', async () => {
    queueFrom({ error: new Error('followers failed') }, { count: 1 })
    await expect(fetchFollowCounts('u1')).rejects.toThrow('followers failed')
  })

  it('throws if the following query errors', async () => {
    queueFrom({ count: 1 }, { error: new Error('following failed') })
    await expect(fetchFollowCounts('u1')).rejects.toThrow('following failed')
  })
})

describe('followUser / unfollowUser', () => {
  it('followUser inserts and returns the saved row', async () => {
    queueFrom({ data: follow() })
    expect(await followUser('u1', 'u2')).toEqual(follow())
  })

  it('followUser throws on a Supabase error', async () => {
    queueFrom({ error: new Error('insert failed') })
    await expect(followUser('u1', 'u2')).rejects.toThrow('insert failed')
  })

  it('unfollowUser resolves without error on success', async () => {
    queueFrom({})
    await expect(unfollowUser('u1', 'u2')).resolves.toBeUndefined()
  })

  it('unfollowUser throws on a Supabase error', async () => {
    queueFrom({ error: new Error('delete failed') })
    await expect(unfollowUser('u1', 'u2')).rejects.toThrow('delete failed')
  })
})

describe('fetchFollowersWithUsers / fetchFollowingWithUsers', () => {
  it('resolves follower ids to user rows in the same order', async () => {
    queueFrom(
      { data: [{ follower_id: 'u2', created_at: '2026-01-02T00:00:00Z' }, { follower_id: 'u3', created_at: '2026-01-01T00:00:00Z' }] },
      { data: [user({ id: 'u3', username: 'carol' }), user({ id: 'u2', username: 'bob' })] },
    )
    const result = await fetchFollowersWithUsers('u1')
    expect(result.map((u) => u.id)).toEqual(['u2', 'u3'])
  })

  it('drops ids that have no matching user row', async () => {
    queueFrom({ data: [{ follower_id: 'ghost', created_at: '2026-01-01T00:00:00Z' }] }, { data: [] })
    expect(await fetchFollowersWithUsers('u1')).toEqual([])
  })

  it('returns an empty array with zero follows, skipping the user lookup entirely', async () => {
    const builders = queueFrom({ data: [] })
    const result = await fetchFollowersWithUsers('u1')
    expect(result).toEqual([])
    expect(vi.mocked(supabase.from).mock.calls.length).toBe(builders.length)
  })

  it('fetchFollowingWithUsers resolves followed ids to user rows', async () => {
    queueFrom({ data: [{ followed_id: 'u2', created_at: '2026-01-01T00:00:00Z' }] }, { data: [user()] })
    const result = await fetchFollowingWithUsers('u1')
    expect(result.map((u) => u.id)).toEqual(['u2'])
  })
})

describe('fetchAllFollows', () => {
  it('passes through a single page of results', async () => {
    const rows = [follow()]
    queueFrom({ data: rows, count: rows.length })
    expect(await fetchAllFollows()).toEqual(rows)
  })
})
