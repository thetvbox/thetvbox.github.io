import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  deleteSeasonRating,
  fetchAllSeasonRatingsForShow,
  fetchRecentSeasonRatingsAllUsers,
  upsertSeasonRating,
} from './seasonRatings'
import type { SeasonRating } from '../types'

function row(overrides: Partial<SeasonRating> = {}): SeasonRating {
  return {
    id: 'sr1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    season_number: 1,
    season_name: 'Season 1',
    rating: 4,
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

describe('fetchAllSeasonRatingsForShow', () => {
  it('returns every season rating for the show', async () => {
    mockFrom({ data: [row(), row({ id: 'sr2', season_number: 2 })] })
    expect(await fetchAllSeasonRatingsForShow(1)).toHaveLength(2)
  })

  it('returns an empty array when there are none', async () => {
    mockFrom({ data: null })
    expect(await fetchAllSeasonRatingsForShow(1)).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchAllSeasonRatingsForShow(1)).rejects.toThrow('boom')
  })
})

describe('fetchRecentSeasonRatingsAllUsers', () => {
  it('passes through a single page of results', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentSeasonRatingsAllUsers()).toEqual(rows)
  })
})

describe('upsertSeasonRating', () => {
  it('upserts on the (user, show, season) key and returns the saved row', async () => {
    const builder = mockFrom({ data: row({ rating: 3.5 }) })
    const saved = await upsertSeasonRating({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      seasonNumber: 1,
      seasonName: 'Season 1',
      rating: 3.5,
    })
    expect(saved.rating).toBe(3.5)
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ season_number: 1, rating: 3.5 }),
      { onConflict: 'user_id,show_id,season_number' },
    )
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('upsert failed') })
    await expect(
      upsertSeasonRating({
        userId: 'u1',
        showId: 1,
        showName: 'Show One',
        showPosterPath: null,
        seasonNumber: 1,
        seasonName: null,
        rating: 3.5,
      }),
    ).rejects.toThrow('upsert failed')
  })
})

describe('deleteSeasonRating', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(deleteSeasonRating('u1', 1, 1)).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(deleteSeasonRating('u1', 1, 1)).rejects.toThrow('delete failed')
  })
})
