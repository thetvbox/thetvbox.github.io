import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { dropShow, fetchDroppedForUser, fetchDroppedItem, undropShow } from './showDropped'
import type { ShowDropped } from '../types'

function row(overrides: Partial<ShowDropped> = {}): ShowDropped {
  return {
    id: 'd1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    dropped_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchDroppedForUser', () => {
  it('queries the show_dropped table for the given user', async () => {
    const builder = mockFrom({ data: [row()], error: null })
    const result = await fetchDroppedForUser('u1')
    expect(result).toEqual([row()])
    expect(supabase.from).toHaveBeenCalledWith('show_dropped')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null, error: null })
    expect(await fetchDroppedForUser('u1')).toEqual([])
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'fail' } })
    await expect(fetchDroppedForUser('u1')).rejects.toEqual({ message: 'fail' })
  })
})

describe('fetchDroppedItem', () => {
  it('returns the row when found', async () => {
    mockFrom({ data: row(), error: null })
    expect(await fetchDroppedItem('u1', 1)).toEqual(row())
  })

  it('returns null when not dropped', async () => {
    mockFrom({ data: null, error: null })
    expect(await fetchDroppedItem('u1', 1)).toBeNull()
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'fail' } })
    await expect(fetchDroppedItem('u1', 1)).rejects.toEqual({ message: 'fail' })
  })
})

describe('dropShow', () => {
  it('upserts on the user/show conflict key', async () => {
    const builder = mockFrom({ data: row(), error: null })
    await dropShow({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null })
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', show_id: 1, show_name: 'Show One' }),
      { onConflict: 'user_id,show_id' },
    )
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'fail' } })
    await expect(
      dropShow({ userId: 'u1', showId: 1, showName: 'Show', showPosterPath: null }),
    ).rejects.toEqual({ message: 'fail' })
  })
})

describe('undropShow', () => {
  it('deletes by user and show id', async () => {
    const builder = mockFrom({ error: null })
    await undropShow('u1', 1)
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).toHaveBeenCalledWith('show_id', 1)
  })

  it('throws on error', async () => {
    mockFrom({ error: { message: 'fail' } })
    await expect(undropShow('u1', 1)).rejects.toEqual({ message: 'fail' })
  })
})
