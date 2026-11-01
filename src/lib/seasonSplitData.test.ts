import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('./tmdb', () => ({ getShowDetail: vi.fn() }))
vi.mock('./tvmaze', () => ({ getTvmazeSeasonSizes: vi.fn() }))

import { supabase } from './supabase'
import { getShowDetail } from './tmdb'
import { getTvmazeSeasonSizes } from './tvmaze'
import { fetchSeasonSplits, syncSeasonSplits } from './seasonSplitData'
import type { TmdbShowDetail } from '../types'

function tmdbShow(id: number, counts: number[]): TmdbShowDetail {
  return {
    id,
    name: 'Lupin',
    seasons: counts.map((episode_count, i) => ({
      id: i,
      season_number: i + 1,
      name: `Season ${i + 1}`,
      episode_count,
      poster_path: null,
      air_date: null,
    })),
    external_ids: { imdb_id: 'tt2531336' },
  } as TmdbShowDetail
}

function mockSplitRows(rows: { tmdb_season: number; part_sizes: number[] }[] | null, error: unknown = null) {
  const builder = createQueryBuilder({ data: rows, error })
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
  vi.mocked(supabase.rpc).mockReset()
  vi.mocked(getShowDetail).mockReset()
  vi.mocked(getTvmazeSeasonSizes).mockReset()
})

describe('fetchSeasonSplits', () => {
  it("reads a show's recorded splits once per session", async () => {
    const builder = mockSplitRows([{ tmdb_season: 1, part_sizes: [5, 5] }])
    expect(await fetchSeasonSplits(1)).toEqual([{ tmdbSeason: 1, partSizes: [5, 5] }])
    expect(await fetchSeasonSplits(1)).toEqual([{ tmdbSeason: 1, partSizes: [5, 5] }])
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('season_splits')
    expect(builder.eq).toHaveBeenCalledWith('show_id', 1)
  })

  it('throws on a read error, and asks again next time instead of caching the failure', async () => {
    mockSplitRows(null, new Error('offline'))
    await expect(fetchSeasonSplits(2)).rejects.toThrow('offline')
    mockSplitRows([])
    expect(await fetchSeasonSplits(2)).toEqual([])
  })
})

describe('syncSeasonSplits', () => {
  it('records a newly found split and forgets the cached splits so the next read sees it', async () => {
    vi.mocked(getShowDetail).mockResolvedValue(tmdbShow(10, [10, 7, 8]))
    vi.mocked(getTvmazeSeasonSizes).mockResolvedValue([5, 5, 7, 8])
    mockSplitRows([])
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    expect(await syncSeasonSplits(10)).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('record_season_splits', {
      p_show_id: 10,
      p_splits: [{ tmdb_season: 1, part_sizes: [5, 5] }],
    })
    mockSplitRows([{ tmdb_season: 1, part_sizes: [5, 5] }])
    expect(await fetchSeasonSplits(10)).toEqual([{ tmdbSeason: 1, partSizes: [5, 5] }])
  })

  it('records nothing when the split is already known', async () => {
    vi.mocked(getShowDetail).mockResolvedValue(tmdbShow(11, [10, 7, 8]))
    vi.mocked(getTvmazeSeasonSizes).mockResolvedValue([5, 5, 7, 8])
    mockSplitRows([{ tmdb_season: 1, part_sizes: [5, 5] }])
    expect(await syncSeasonSplits(11)).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('records nothing when TVmaze numbers the seasons the same way or has nothing', async () => {
    vi.mocked(getShowDetail).mockResolvedValue(tmdbShow(12, [10, 7]))
    vi.mocked(getTvmazeSeasonSizes).mockResolvedValueOnce([10, 7]).mockResolvedValueOnce(null)
    mockSplitRows([])
    expect(await syncSeasonSplits(12)).toBe(false)
    expect(await syncSeasonSplits(12)).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('throws when recording fails', async () => {
    vi.mocked(getShowDetail).mockResolvedValue(tmdbShow(13, [10]))
    vi.mocked(getTvmazeSeasonSizes).mockResolvedValue([5, 5])
    mockSplitRows([])
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('denied') } as never)
    await expect(syncSeasonSplits(13)).rejects.toThrow('denied')
  })
})
