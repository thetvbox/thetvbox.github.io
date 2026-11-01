import { describe, expect, it } from 'vitest'
import {
  detectSeasonSplits,
  splitSeasonDetail,
  splitShowDetail,
  tmdbSeasonPart,
  toDisplayEpisode,
  toTmdbEpisode,
} from './seasonSplits'
import type { TmdbEpisode, TmdbSeasonDetail, TmdbShowDetail } from '../types'

const LUPIN = [{ tmdbSeason: 1, partSizes: [5, 5] }]

function seasonSummary(season_number: number, episode_count: number, name = `Season ${season_number}`) {
  return { id: 100 + season_number, season_number, name, episode_count, poster_path: null, air_date: `202${season_number}-01-01` }
}

function show(seasons = [seasonSummary(1, 10), seasonSummary(2, 7, 'Part 3'), seasonSummary(3, 8, 'Part 4')]): TmdbShowDetail {
  return {
    id: 96677,
    name: 'Lupin',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2021-01-08',
    genres: [],
    number_of_seasons: seasons.length,
    number_of_episodes: 25,
    status: 'Returning Series',
    origin_country: ['FR'],
    original_language: 'fr',
    seasons,
  }
}

function episode(season_number: number, episode_number: number): TmdbEpisode {
  return {
    id: season_number * 1000 + episode_number,
    season_number,
    episode_number,
    name: `Chapter ${episode_number}`,
    overview: '',
    still_path: null,
    air_date: `2021-0${season_number}-${String(episode_number).padStart(2, '0')}`,
    runtime: 45,
  }
}

function seasonDetail(season_number: number, count: number): TmdbSeasonDetail {
  return {
    id: 500 + season_number,
    season_number,
    name: `Season ${season_number}`,
    air_date: '2021-01-08',
    episodes: Array.from({ length: count }, (_, i) => episode(season_number, i + 1)),
  }
}

describe('detectSeasonSplits', () => {
  it("finds that Lupin's TMDB season 1 is the streamer's first two seasons", () => {
    expect(detectSeasonSplits(show().seasons, [5, 5, 7, 8])).toEqual(LUPIN)
  })

  it('finds nothing when both number seasons the same way', () => {
    expect(detectSeasonSplits(show().seasons, [10, 7, 8])).toEqual([])
  })

  it('ignores specials and keeps going through later splits', () => {
    const seasons = [seasonSummary(0, 3), seasonSummary(1, 4), seasonSummary(2, 9)]
    expect(detectSeasonSplits(seasons, [4, 3, 6])).toEqual([{ tmdbSeason: 2, partSizes: [3, 6] }])
  })

  it('stops at the first season where the two disagree, so a season still airing never produces a guess', () => {
    expect(detectSeasonSplits(show().seasons, [5, 5, 6, 8])).toEqual(LUPIN)
    expect(detectSeasonSplits([seasonSummary(1, 10), seasonSummary(2, 8)], [6, 5, 4, 4])).toEqual([])
  })

  it('stops at a season TMDB lists with no episodes yet', () => {
    expect(detectSeasonSplits([seasonSummary(1, 0), seasonSummary(2, 10)], [5, 5])).toEqual([])
  })
})

describe('toDisplayEpisode and toTmdbEpisode', () => {
  it('map split parts and the seasons after them both ways', () => {
    const cases: [number, number, number, number][] = [
      [1, 1, 1, 1],
      [1, 5, 1, 5],
      [1, 6, 2, 1],
      [1, 10, 2, 5],
      [2, 3, 3, 3],
      [3, 8, 4, 8],
    ]
    for (const [tmdbSeason, tmdbEpisode, season, episodeNumber] of cases) {
      expect(toDisplayEpisode(LUPIN, tmdbSeason, tmdbEpisode)).toEqual({ season, episode: episodeNumber })
      expect(toTmdbEpisode(LUPIN, season, episodeNumber)).toEqual({ season: tmdbSeason, episode: tmdbEpisode })
    }
  })

  it('puts episodes past a split into its last part', () => {
    expect(toDisplayEpisode(LUPIN, 1, 12)).toEqual({ season: 2, episode: 7 })
  })

  it('leaves seasons before a split alone, and everything alone without splits', () => {
    expect(toDisplayEpisode([{ tmdbSeason: 2, partSizes: [3, 4] }], 1, 9)).toEqual({ season: 1, episode: 9 })
    expect(toTmdbEpisode([], 3, 4)).toEqual({ season: 3, episode: 4 })
  })

  it('handles two splits regardless of their order', () => {
    const splits = [{ tmdbSeason: 3, partSizes: [2, 2, 2] }, ...LUPIN]
    expect(toDisplayEpisode(splits, 3, 5)).toEqual({ season: 6, episode: 1 })
    expect(toTmdbEpisode(splits, 6, 1)).toEqual({ season: 3, episode: 5 })
    expect(tmdbSeasonPart(splits, 7)).toEqual({ tmdbSeason: 4, episodeOffset: 0, size: null })
  })
})

describe('splitShowDetail', () => {
  it("lists Lupin's four seasons with the streamer's episode counts and plain season names", () => {
    const result = splitShowDetail(show(), LUPIN)
    expect(result.seasons.map((s) => [s.season_number, s.name, s.episode_count])).toEqual([
      [1, 'Season 1', 5],
      [2, 'Season 2', 5],
      [3, 'Season 3', 7],
      [4, 'Season 4', 8],
    ])
    expect(result.number_of_seasons).toBe(4)
    expect(new Set(result.seasons.map((s) => s.id)).size).toBe(4)
    expect(result.seasons[1].air_date).toBeNull()
  })

  it('keeps specials and returns the show untouched without splits', () => {
    const withSpecials = show([seasonSummary(0, 2, 'Specials'), seasonSummary(1, 10)])
    expect(splitShowDetail(withSpecials, LUPIN).seasons[0]).toEqual(withSpecials.seasons[0])
    const plain = show()
    expect(splitShowDetail(plain, [])).toBe(plain)
  })

  it("gives a split's last part whatever TMDB adds beyond the recorded sizes", () => {
    const grown = show([seasonSummary(1, 11)])
    expect(splitShowDetail(grown, LUPIN).seasons.map((s) => s.episode_count)).toEqual([5, 6])
  })
})

describe('splitSeasonDetail', () => {
  it('cuts the second part out of TMDB season 1 and renumbers it as season 2', () => {
    const result = splitSeasonDetail(seasonDetail(1, 10), LUPIN, 2)
    expect(result.season_number).toBe(2)
    expect(result.name).toBe('Season 2')
    expect(result.episodes.map((e) => [e.season_number, e.episode_number, e.id])).toEqual([
      [2, 1, 1006],
      [2, 2, 1007],
      [2, 3, 1008],
      [2, 4, 1009],
      [2, 5, 1010],
    ])
    expect(result.air_date).toBe('2021-01-06')
    expect(result.id).not.toBe(501)
  })

  it('keeps only the first part for season 1', () => {
    expect(splitSeasonDetail(seasonDetail(1, 10), LUPIN, 1).episodes.map((e) => e.episode_number)).toEqual([1, 2, 3, 4, 5])
  })

  it('renumbers a later whole season without cutting it', () => {
    const result = splitSeasonDetail(seasonDetail(3, 8), LUPIN, 4)
    expect(result.season_number).toBe(4)
    expect(result.id).toBe(503)
    expect(result.episodes).toHaveLength(8)
    expect(result.episodes[0].season_number).toBe(4)
  })

  it('returns the season untouched without splits', () => {
    const detail = seasonDetail(2, 7)
    expect(splitSeasonDetail(detail, [], 2)).toBe(detail)
  })
})
