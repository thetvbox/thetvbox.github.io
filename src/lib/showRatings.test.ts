import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  deleteShowRating,
  fetchAllShowRatings,
  fetchRecentShowRatings,
  fetchRecentShowRatingsAllUsers,
  fetchShowRating,
  upsertShowRating,
} from './showRatings'
import type { ShowRating } from '../types'

function row(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4.5,
    rated_at: '2026-01-01T00:00:00Z',
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

describe('fetchShowRating', () => {
  it('returns the rating row when one exists', async () => {
    mockFrom({ data: row() })
    expect(await fetchShowRating('u1', 1)).toEqual(row())
  })

  it('returns null when the user has not rated the show', async () => {
    mockFrom({ data: null })
    expect(await fetchShowRating('u1', 1)).toBeNull()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchShowRating('u1', 1)).rejects.toThrow('boom')
  })
})

describe('fetchAllShowRatings', () => {
  it('returns an empty array when there are no ratings', async () => {
    mockFrom({ data: null })
    expect(await fetchAllShowRatings(1)).toEqual([])
  })

  it('returns every rating for the show', async () => {
    mockFrom({ data: [row(), row({ id: 'r2', user_id: 'u2' })] })
    expect(await fetchAllShowRatings(1)).toHaveLength(2)
  })
})

describe('fetchRecentShowRatings / fetchRecentShowRatingsAllUsers', () => {
  it('passes through a single page of results', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentShowRatings('u1')).toEqual(rows)
  })

  it('fetchRecentShowRatingsAllUsers passes through a single page of results', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentShowRatingsAllUsers()).toEqual(rows)
  })
})

describe('upsertShowRating', () => {
  it('upserts and returns the saved row', async () => {
    const builder = mockFrom({ data: row({ rating: 5 }) })
    const saved = await upsertShowRating({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      rating: 5,
    })
    expect(saved.rating).toBe(5)
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', show_id: 1, rating: 5 }),
      { onConflict: 'user_id,show_id' },
    )
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('upsert failed') })
    await expect(
      upsertShowRating({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null, rating: 5 }),
    ).rejects.toThrow('upsert failed')
  })
})

describe('deleteShowRating', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(deleteShowRating('u1', 1)).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(deleteShowRating('u1', 1)).rejects.toThrow('delete failed')
  })
})
