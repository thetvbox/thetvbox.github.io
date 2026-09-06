import { describe, expect, it } from 'vitest'
import { availableRecapYears, buildYearRecap } from './recap'
import type { ShowActivity } from './showActivity'
import type { EpisodeWatched, ShowRating, ShowRewatch } from '../types'

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4,
    rated_at: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

function watched(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    season_number: 1,
    episode_number: 1,
    episode_name: 'Pilot',
    watched_at: '2024-06-01T12:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 30,
    created_at: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

function rewatch(overrides: Partial<ShowRewatch> = {}): ShowRewatch {
  return {
    id: 'rw1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rewatched_at: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

function activity(overrides: Partial<ShowActivity> = {}): ShowActivity {
  return {
    showId: 1,
    showName: 'Show One',
    showPosterPath: null,
    rating: null,
    ratedAt: null,
    watchedCount: 0,
    totalEpisodes: null,
    lastWatchedAt: null,
    lastWatchedAtUnknown: false,
    finished: false,
    finishedAt: null,
    finishedAtUnknown: false,
    started: false,
    startedAt: null,
    dismissed: false,
    dropped: false,
    droppedAt: null,
    ...overrides,
  }
}

describe('availableRecapYears', () => {
  it('collects years from ratings, dated watched rows, and rewatches, newest first', () => {
    const years = availableRecapYears(
      [rating({ rated_at: '2022-01-01T12:00:00Z' })],
      [watched({ watched_at: '2024-01-01T12:00:00Z' })],
      [rewatch({ rewatched_at: '2023-01-01T12:00:00Z' })],
    )
    expect(years).toEqual([2024, 2023, 2022])
  })

  it('excludes watched rows with an unknown date', () => {
    const years = availableRecapYears([], [watched({ watched_at_unknown: true, watched_at: '2024-01-01T12:00:00Z' })], [])
    expect(years).toEqual([])
  })

  it('dedupes repeated years', () => {
    const years = availableRecapYears(
      [rating({ rated_at: '2024-03-01T12:00:00Z' })],
      [watched({ watched_at: '2024-08-01T12:00:00Z' })],
      [],
    )
    expect(years).toEqual([2024])
  })

  it('returns an empty array with no activity at all', () => {
    expect(availableRecapYears([], [], [])).toEqual([])
  })
})

describe('buildYearRecap', () => {
  it('aggregates finished shows, episodes, hours, ratings, and rewatches scoped to the given year', () => {
    const activityRows = [
      activity({ showId: 1, finished: true, finishedAt: '2024-05-01T12:00:00Z', finishedAtUnknown: false }),
      activity({ showId: 2, finished: true, finishedAt: '2023-05-01T12:00:00Z', finishedAtUnknown: false }),
    ]
    const ratings = [rating({ show_id: 1, rating: 4.5, rated_at: '2024-01-01T12:00:00Z' }), rating({ show_id: 2, rating: 3, rated_at: '2024-02-01T12:00:00Z' })]
    const watchedRows = [
      watched({ watched_at: '2024-01-15T12:00:00Z', runtime_minutes: 60 }),
      watched({ watched_at: '2024-02-15T12:00:00Z', runtime_minutes: 60 }),
      watched({ watched_at: '2024-02-20T12:00:00Z', runtime_minutes: 60 }),
    ]
    const rewatches = [rewatch({ rewatched_at: '2024-03-01T12:00:00Z' })]

    const recap = buildYearRecap(2024, activityRows, ratings, watchedRows, rewatches)

    expect(recap.year).toBe(2024)
    expect(recap.showsFinished).toBe(1)
    expect(recap.episodesWatched).toBe(3)
    expect(recap.hoursWatched).toBe(3)
    expect(recap.ratingsGiven).toBe(2)
    expect(recap.avgRating).toBeCloseTo(3.75)
    expect(recap.topRated).toEqual({ showId: 1, showName: 'Show One', showPosterPath: null, rating: 4.5 })
    expect(recap.mostActiveMonth).toBe('February')
    expect(recap.rewatches).toBe(1)
  })

  it('excludes finished shows whose finish date is unknown', () => {
    const recap = buildYearRecap(
      2024,
      [activity({ finished: true, finishedAt: '2024-05-01T12:00:00Z', finishedAtUnknown: true })],
      [],
      [],
      [],
    )
    expect(recap.showsFinished).toBe(0)
  })

  it('returns null avgRating and topRated with no ratings that year', () => {
    const recap = buildYearRecap(2024, [], [], [], [])
    expect(recap.avgRating).toBeNull()
    expect(recap.topRated).toBeNull()
    expect(recap.mostActiveMonth).toBeNull()
  })

  it('treats missing runtime_minutes as zero when summing hours', () => {
    const recap = buildYearRecap(2024, [], [], [watched({ watched_at: '2024-01-01T12:00:00Z', runtime_minutes: null })], [])
    expect(recap.hoursWatched).toBe(0)
    expect(recap.episodesWatched).toBe(1)
  })

  it('excludes watched rows with an unknown date from episode/hour counts', () => {
    const recap = buildYearRecap(
      2024,
      [],
      [],
      [watched({ watched_at: '2024-01-01T12:00:00Z', watched_at_unknown: true, runtime_minutes: 60 })],
      [],
    )
    expect(recap.episodesWatched).toBe(0)
    expect(recap.hoursWatched).toBe(0)
  })
})
