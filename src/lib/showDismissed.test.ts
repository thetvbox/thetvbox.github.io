import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { dismissShow, fetchDismissedForUser, fetchDismissedItem, undismissShow } from './showDismissed'
import type { ShowWatchingDismissed } from '../types'

function row(overrides: Partial<ShowWatchingDismissed> = {}): ShowWatchingDismissed {
  return { id: 'd1', user_id: 'u1', show_id: 1, dismissed_at: '2026-01-01T00:00:00Z', ...overrides }
}

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchDismissedForUser', () => {
  it('queries the show_watching_dismissed table for the given user', async () => {
    mockFrom({ data: [row()], error: null })
    expect(await fetchDismissedForUser('u1')).toEqual([row()])
    expect(supabase.from).toHaveBeenCalledWith('show_watching_dismissed')
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'fail' } })
    await expect(fetchDismissedForUser('u1')).rejects.toEqual({ message: 'fail' })
  })
})

describe('fetchDismissedItem', () => {
  it('returns null when not dismissed', async () => {
    mockFrom({ data: null, error: null })
    expect(await fetchDismissedItem('u1', 1)).toBeNull()
  })

  it('returns the row when dismissed', async () => {
    mockFrom({ data: row(), error: null })
    expect(await fetchDismissedItem('u1', 1)).toEqual(row())
  })
})

describe('dismissShow', () => {
  it('upserts on the user/show conflict key', async () => {
    const builder = mockFrom({ data: row(), error: null })
    await dismissShow('u1', 1)
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', show_id: 1 }),
      { onConflict: 'user_id,show_id' },
    )
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'fail' } })
    await expect(dismissShow('u1', 1)).rejects.toEqual({ message: 'fail' })
  })
})

describe('undismissShow', () => {
  it('deletes by user and show id', async () => {
    const builder = mockFrom({ error: null })
    await undismissShow('u1', 1)
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).toHaveBeenCalledWith('show_id', 1)
  })

  it('throws on error', async () => {
    mockFrom({ error: { message: 'fail' } })
    await expect(undismissShow('u1', 1)).rejects.toEqual({ message: 'fail' })
  })
})
