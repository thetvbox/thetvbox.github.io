import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  clearAllNotifications,
  fetchNotifications,
  fetchUnseenNotificationCount,
  markNotificationsSeenAndPrune,
} from './notifications'
import type { Notification } from '../types'

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

function queueFrom(...results: Parameters<typeof createQueryBuilder>[0][]) {
  const builders = results.map(createQueryBuilder)
  const from = vi.mocked(supabase.from)
  builders.forEach((b) => from.mockImplementationOnce(() => b as never))
  return builders
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchNotifications', () => {
  it('returns the fetched notifications', async () => {
    queueFrom({ data: [notification(), notification({ id: 'n2' })] })
    expect(await fetchNotifications('u1')).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    queueFrom({ data: null })
    expect(await fetchNotifications('u1')).toEqual([])
  })

  it('passes a custom limit through to .limit()', async () => {
    const [builder] = queueFrom({ data: [] })
    await fetchNotifications('u1', 5)
    expect(builder.limit).toHaveBeenCalledWith(5)
  })

  it('throws on a Supabase error', async () => {
    queueFrom({ error: new Error('boom') })
    await expect(fetchNotifications('u1')).rejects.toThrow('boom')
  })
})

describe('fetchUnseenNotificationCount', () => {
  it('returns the count', async () => {
    queueFrom({ count: 4 })
    expect(await fetchUnseenNotificationCount('u1')).toBe(4)
  })

  it('defaults a missing count to zero', async () => {
    queueFrom({ count: null })
    expect(await fetchUnseenNotificationCount('u1')).toBe(0)
  })

  it('throws on a Supabase error', async () => {
    queueFrom({ error: new Error('boom') })
    await expect(fetchUnseenNotificationCount('u1')).rejects.toThrow('boom')
  })
})

describe('markNotificationsSeenAndPrune', () => {
  it('marks unseen rows seen, then prunes stale seen rows, resolving on success', async () => {
    queueFrom({}, {})
    await expect(markNotificationsSeenAndPrune('u1')).resolves.toBeUndefined()
  })

  it('throws if the seen-marking update fails, without attempting the prune', async () => {
    const builders = queueFrom({ error: new Error('update failed') }, {})
    await expect(markNotificationsSeenAndPrune('u1')).rejects.toThrow('update failed')
    expect(builders[1].delete).not.toHaveBeenCalled()
  })

  it('throws if the prune delete fails', async () => {
    queueFrom({}, { error: new Error('prune failed') })
    await expect(markNotificationsSeenAndPrune('u1')).rejects.toThrow('prune failed')
  })
})

describe('clearAllNotifications', () => {
  it('resolves without error on success', async () => {
    queueFrom({})
    await expect(clearAllNotifications('u1')).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    queueFrom({ error: new Error('delete failed') })
    await expect(clearAllNotifications('u1')).rejects.toThrow('delete failed')
  })
})
