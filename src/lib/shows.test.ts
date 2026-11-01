import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./tmdb', () => ({ getShowDetail: vi.fn(), getSeasonDetail: vi.fn() }))
vi.mock('./seasonSplitData', () => ({ fetchSeasonSplits: vi.fn() }))

import { getSeasonDetail as getTmdbSeasonDetail, getShowDetail as getTmdbShowDetail } from './tmdb'
import { fetchSeasonSplits } from './seasonSplitData'
import { getSeasonDetail, getShowDetail, getShowDetailsBulk } from './shows'
import type { TmdbSeasonDetail, TmdbShowDetail } from '../types'

const LUPIN = [{ tmdbSeason: 1, partSizes: [5, 5] }]

function show(id = 96677): TmdbShowDetail {
  return {
    id,
    name: 'Lupin',
    number_of_seasons: 3,
    seasons: [10, 7, 8].map((episode_count, i) => ({
      id: i + 1,
      season_number: i + 1,
      name: `Season ${i + 1}`,
      episode_count,
      poster_path: null,
      air_date: null,
    })),
  } as TmdbShowDetail
}

function tmdbSeason(season_number: number, count: number): TmdbSeasonDetail {
  return {
    id: season_number,
    season_number,
    name: `Season ${season_number}`,
    air_date: null,
    episodes: Array.from({ length: count }, (_, i) => ({
      id: season_number * 100 + i + 1,
      season_number,
      episode_number: i + 1,
      name: '',
      overview: '',
      still_path: null,
      air_date: null,
      runtime: null,
    })),
  }
}

beforeEach(() => {
  vi.mocked(getTmdbShowDetail).mockReset()
  vi.mocked(getTmdbSeasonDetail).mockReset()
  vi.mocked(fetchSeasonSplits).mockReset()
})

describe('getShowDetail', () => {
  it("returns the show with the streamer's seasons when it has splits", async () => {
    vi.mocked(getTmdbShowDetail).mockResolvedValue(show())
    vi.mocked(fetchSeasonSplits).mockResolvedValue(LUPIN)
    const result = await getShowDetail(96677)
    expect(result.seasons.map((s) => s.episode_count)).toEqual([5, 5, 7, 8])
    expect(result.number_of_seasons).toBe(4)
  })

  it("fails rather than fall back to TMDB's numbering when the splits can't be read", async () => {
    vi.mocked(getTmdbShowDetail).mockResolvedValue(show())
    vi.mocked(fetchSeasonSplits).mockRejectedValue(new Error('offline'))
    await expect(getShowDetail(96677)).rejects.toThrow('offline')
  })
})

describe('getShowDetailsBulk', () => {
  it('loads each show once and leaves out the ones that fail', async () => {
    vi.mocked(getTmdbShowDetail).mockImplementation(async (id) => {
      if (id === 2) throw new Error('missing')
      return show(id)
    })
    vi.mocked(fetchSeasonSplits).mockResolvedValue([])
    const result = await getShowDetailsBulk([1, 2, 1])
    expect([...result.keys()]).toEqual([1])
    expect(getTmdbShowDetail).toHaveBeenCalledTimes(2)
  })
})

describe('getSeasonDetail', () => {
  it("fetches the TMDB season a streamer season lives in and cuts it out", async () => {
    vi.mocked(fetchSeasonSplits).mockResolvedValue(LUPIN)
    vi.mocked(getTmdbSeasonDetail).mockResolvedValue(tmdbSeason(1, 10))
    const result = await getSeasonDetail(96677, 2)
    expect(getTmdbSeasonDetail).toHaveBeenCalledWith(96677, 1)
    expect(result.episodes.map((e) => [e.season_number, e.episode_number])).toEqual([
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
    ])
  })

  it('asks TMDB for the shifted season after a split', async () => {
    vi.mocked(fetchSeasonSplits).mockResolvedValue(LUPIN)
    vi.mocked(getTmdbSeasonDetail).mockResolvedValue(tmdbSeason(3, 8))
    const result = await getSeasonDetail(96677, 4)
    expect(getTmdbSeasonDetail).toHaveBeenCalledWith(96677, 3)
    expect(result.season_number).toBe(4)
  })
})
