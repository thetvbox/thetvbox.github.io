import { describe, expect, it } from 'vitest'
import { computeSeasonProgress, countWatchedBySeason } from './seasonProgress'
import type { TmdbSeasonSummary } from '../types'

function season(seasonNumber: number, episodeCount: number): TmdbSeasonSummary {
  return { id: seasonNumber, season_number: seasonNumber, name: `Season ${seasonNumber}`, episode_count: episodeCount, poster_path: null, air_date: null }
}

describe('countWatchedBySeason', () => {
  it('tallies rows per season', () => {
    const rows = [{ season_number: 1 }, { season_number: 1 }, { season_number: 2 }]
    expect(countWatchedBySeason(rows)).toEqual({ 1: 2, 2: 1 })
  })

  it('returns an empty object for no rows', () => {
    expect(countWatchedBySeason([])).toEqual({})
  })
})

describe('computeSeasonProgress', () => {
  it('returns null when there are no real seasons (specials only)', () => {
    expect(computeSeasonProgress([season(0, 3)], {})).toBeNull()
  })

  it('returns null when every real season has zero episodes', () => {
    expect(computeSeasonProgress([season(1, 0)], {})).toBeNull()
  })

  it('excludes season 0 (specials) from segments', () => {
    const result = computeSeasonProgress([season(0, 5), season(1, 10)], {})
    expect(result?.segments).toHaveLength(1)
    expect(result?.segments[0].seasonNumber).toBe(1)
  })

  it('picks the first not-fully-watched season as current', () => {
    const seasons = [season(1, 10), season(2, 10), season(3, 8)]
    const watched = { 1: 10, 2: 4 }
    const result = computeSeasonProgress(seasons, watched)
    expect(result?.currentSeasonNumber).toBe(2)
    expect(result?.currentSeasonWatched).toBe(4)
    expect(result?.currentSeasonTotal).toBe(10)
  })

  it('falls back to the last season when everything is finished', () => {
    const seasons = [season(1, 10), season(2, 8)]
    const watched = { 1: 10, 2: 8 }
    const result = computeSeasonProgress(seasons, watched)
    expect(result?.currentSeasonNumber).toBe(2)
    expect(result?.currentSeasonWatched).toBe(8)
  })

  it('clamps a watched count that exceeds the season episode total', () => {
    const result = computeSeasonProgress([season(1, 5)], { 1: 99 })
    expect(result?.segments[0].watched).toBe(5)
    expect(result?.currentSeasonWatched).toBe(5)
  })

  it('treats a season with no watched rows as zero, not undefined', () => {
    const result = computeSeasonProgress([season(1, 5)], {})
    expect(result?.segments[0].watched).toBe(0)
    expect(result?.currentSeasonNumber).toBe(1)
  })

  it('sorts segments by season number regardless of input order', () => {
    const seasons = [season(3, 5), season(1, 5), season(2, 5)]
    const result = computeSeasonProgress(seasons, {})
    expect(result?.segments.map((s) => s.seasonNumber)).toEqual([1, 2, 3])
  })
})
