import { describe, expect, it } from 'vitest'
import {
  buildDiaryEntries,
  buildFollowActivity,
  buildGroupActivity,
  buildUndatedDiaryEntriesFromSummary,
  mergeActivityFeed,
  nowWatching,
  seasonLabelFor,
  sortHistory,
  summarizeFromWatchSummary,
  summarizeShowActivity,
  watchHistory,
  type ShowActivity,
} from './showActivity'
import type {
  EpisodeWatched,
  EpisodeWatchedWithUser,
  Follow,
  ShowDropped,
  ShowRating,
  ShowRatingWithUser,
  ShowRewatch,
  ShowStarted,
  ShowWatchingDismissed,
  ShowWatchSummary,
  UndatedShowWatchSummary,
} from '../types'

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4,
    rated_at: '2026-01-01T00:00:00Z',
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
    watched_at: '2026-01-01T00:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function started(overrides: Partial<ShowStarted> = {}): ShowStarted {
  return {
    id: 's1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    started_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function dismissed(overrides: Partial<ShowWatchingDismissed> = {}): ShowWatchingDismissed {
  return { id: 'd1', user_id: 'u1', show_id: 1, dismissed_at: '2026-01-01T00:00:00Z', ...overrides }
}

function dropped(overrides: Partial<ShowDropped> = {}): ShowDropped {
  return {
    id: 'dr1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    dropped_at: '2026-01-01T00:00:00Z',
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
    rewatched_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function watchSummary(overrides: Partial<ShowWatchSummary> = {}): ShowWatchSummary {
  return {
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    watched_count: 10,
    total_episodes: 10,
    last_watched_at: '2026-01-01T00:00:00Z',
    last_watched_at_unknown: false,
    runtime_minutes_sum: 420,
    ...overrides,
  }
}

describe('summarizeShowActivity', () => {
  it('merges a rating and watched rows for the same show into one entry', () => {
    const [entry] = summarizeShowActivity([rating()], [watched()])
    expect(entry.showId).toBe(1)
    expect(entry.rating).toBe(4)
    expect(entry.watchedCount).toBe(1)
  })

  it('marks a show finished when watchedCount reaches totalEpisodes', () => {
    const rows = [watched({ episode_number: 1 }), watched({ id: 'w2', episode_number: 2 })]
    const [entry] = summarizeShowActivity([], rows.map((r) => ({ ...r, show_total_episodes: 2 })))
    expect(entry.finished).toBe(true)
    expect(entry.finishedAt).toBe(entry.lastWatchedAt)
  })

  it('does not mark a show finished when total episodes is unknown', () => {
    const [entry] = summarizeShowActivity([], [watched({ show_total_episodes: null })])
    expect(entry.finished).toBe(false)
    expect(entry.finishedAt).toBeNull()
  })

  it('tracks the most recently watched episode and its unknown-date flag', () => {
    const rows = [
      watched({ id: 'w1', watched_at: '2026-01-01T00:00:00Z', watched_at_unknown: false }),
      watched({ id: 'w2', watched_at: '2026-02-01T00:00:00Z', watched_at_unknown: true }),
    ]
    const [entry] = summarizeShowActivity([], rows)
    expect(entry.lastWatchedAt).toBe('2026-02-01T00:00:00Z')
    expect(entry.lastWatchedAtUnknown).toBe(true)
  })

  it('takes the max show_total_episodes across rows, ignoring nulls', () => {
    const rows = [
      watched({ id: 'w1', show_total_episodes: null }),
      watched({ id: 'w2', episode_number: 2, show_total_episodes: 8 }),
    ]
    const [entry] = summarizeShowActivity([], rows)
    expect(entry.totalEpisodes).toBe(8)
  })

  it('applies started_at and shows started without any watched episodes', () => {
    const [entry] = summarizeShowActivity([], [], [started()])
    expect(entry.started).toBe(true)
    expect(entry.startedAt).toBe('2026-01-01T00:00:00Z')
    expect(entry.watchedCount).toBe(0)
  })

  it('flags a dismissed show only when a matching entry already exists', () => {
    const result = summarizeShowActivity([], [], [], [dismissed({ show_id: 99 })])
    expect(result).toHaveLength(0)
  })

  it('flags dismissed on an existing entry', () => {
    const [entry] = summarizeShowActivity([], [watched()], [], [dismissed()])
    expect(entry.dismissed).toBe(true)
  })

  it('flags dropped with its timestamp on an existing entry', () => {
    const [entry] = summarizeShowActivity([], [watched()], [], [], [dropped({ dropped_at: '2026-03-01T00:00:00Z' })])
    expect(entry.dropped).toBe(true)
    expect(entry.droppedAt).toBe('2026-03-01T00:00:00Z')
  })

  it('keeps separate shows as separate entries', () => {
    const result = summarizeShowActivity(
      [rating({ show_id: 1 }), rating({ id: 'r2', show_id: 2, show_name: 'Show Two' })],
      [],
    )
    expect(result).toHaveLength(2)
  })

  it('returns an empty array for all-empty input', () => {
    expect(summarizeShowActivity([], [])).toEqual([])
  })
})

describe('summarizeFromWatchSummary', () => {
  it('produces the same finished/rating shape as summarizeShowActivity from aggregated totals', () => {
    const [entry] = summarizeFromWatchSummary([rating()], [watchSummary()])
    expect(entry.rating).toBe(4)
    expect(entry.watchedCount).toBe(10)
    expect(entry.finished).toBe(true)
  })

  it('marks unfinished when watched_count is below total_episodes', () => {
    const [entry] = summarizeFromWatchSummary([], [watchSummary({ watched_count: 3, total_episodes: 10 })])
    expect(entry.finished).toBe(false)
  })
})

describe('nowWatching', () => {
  function activity(overrides: Partial<ShowActivity>): ShowActivity {
    return {
      showId: 1,
      showName: 'Show',
      showPosterPath: null,
      rating: null,
      ratedAt: null,
      watchedCount: 1,
      totalEpisodes: 10,
      lastWatchedAt: '2026-01-01T00:00:00Z',
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

  it('excludes finished, dismissed, and dropped shows', () => {
    const result = nowWatching([
      activity({ showId: 1, finished: true }),
      activity({ showId: 2, dismissed: true }),
      activity({ showId: 3, dropped: true }),
      activity({ showId: 4 }),
    ])
    expect(result.map((s) => s.showId)).toEqual([4])
  })

  it('includes a started-but-not-yet-watched show', () => {
    const result = nowWatching([activity({ showId: 1, watchedCount: 0, started: true, lastWatchedAt: null, startedAt: '2026-01-01T00:00:00Z' })])
    expect(result).toHaveLength(1)
  })

  it('excludes a show with no progress and not started', () => {
    const result = nowWatching([activity({ showId: 1, watchedCount: 0, started: false, lastWatchedAt: null })])
    expect(result).toHaveLength(0)
  })

  it('sorts by most recent watched/started date first', () => {
    const result = nowWatching([
      activity({ showId: 1, lastWatchedAt: '2026-01-01T00:00:00Z' }),
      activity({ showId: 2, lastWatchedAt: '2026-03-01T00:00:00Z' }),
    ])
    expect(result.map((s) => s.showId)).toEqual([2, 1])
  })
})

describe('watchHistory', () => {
  function activity(overrides: Partial<ShowActivity>): ShowActivity {
    return {
      showId: 1,
      showName: 'Show',
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

  it('includes finished shows', () => {
    expect(watchHistory([activity({ finished: true })])).toHaveLength(1)
  })

  it('includes rated-but-never-tracked shows', () => {
    expect(watchHistory([activity({ rating: 5, watchedCount: 0, started: false })])).toHaveLength(1)
  })

  it('excludes a rated show that was actually started/watched but not finished', () => {
    expect(watchHistory([activity({ rating: 5, watchedCount: 3 })])).toHaveLength(0)
  })

  it('excludes an unrated, unfinished show', () => {
    expect(watchHistory([activity({})])).toHaveLength(0)
  })
})

describe('sortHistory', () => {
  function activity(overrides: Partial<ShowActivity>): ShowActivity {
    return {
      showId: 1,
      showName: 'B Show',
      showPosterPath: null,
      rating: 3,
      ratedAt: '2026-01-01T00:00:00Z',
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

  it('sorts by rating descending, unrated last', () => {
    const result = sortHistory(
      [activity({ showId: 1, rating: 2 }), activity({ showId: 2, rating: null }), activity({ showId: 3, rating: 5 })],
      'rating',
    )
    expect(result.map((s) => s.showId)).toEqual([3, 1, 2])
  })

  it('sorts alphabetically by name', () => {
    const result = sortHistory(
      [activity({ showId: 1, showName: 'Zeta' }), activity({ showId: 2, showName: 'Alpha' })],
      'name',
    )
    expect(result.map((s) => s.showId)).toEqual([2, 1])
  })

  it('sorts by finished date descending, unfinished last alphabetically', () => {
    const result = sortHistory(
      [
        activity({ showId: 1, showName: 'B', finishedAt: '2026-01-01T00:00:00Z' }),
        activity({ showId: 2, showName: 'A', finishedAt: null }),
        activity({ showId: 3, showName: 'C', finishedAt: '2026-03-01T00:00:00Z' }),
      ],
      'finished',
    )
    expect(result.map((s) => s.showId)).toEqual([3, 1, 2])
  })

  it('defaults ("recent") to finishedAt, falling back to ratedAt', () => {
    const result = sortHistory(
      [
        activity({ showId: 1, finishedAt: null, ratedAt: '2026-01-01T00:00:00Z' }),
        activity({ showId: 2, finishedAt: '2026-05-01T00:00:00Z', ratedAt: '2026-01-01T00:00:00Z' }),
      ],
      'recent',
    )
    expect(result.map((s) => s.showId)).toEqual([2, 1])
  })

  it('does not mutate the input array', () => {
    const input = [activity({ showId: 1, showName: 'Z' }), activity({ showId: 2, showName: 'A' })]
    const copy = [...input]
    sortHistory(input, 'name')
    expect(input).toEqual(copy)
  })
})

describe('seasonLabelFor', () => {
  it('labels a single season as "Season N"', () => {
    expect(seasonLabelFor([3])).toBe('Season 3')
  })

  it('labels a contiguous or scattered set as a range', () => {
    expect(seasonLabelFor([1, 2, 3])).toBe('S1–S3')
  })

  it('sorts and dedupes before labeling', () => {
    expect(seasonLabelFor([3, 1, 1, 2])).toBe('S1–S3')
  })
})

describe('buildDiaryEntries', () => {
  it('groups same-show, same-day episodes into one entry with an episode range', () => {
    const rows = [
      watched({ id: 'w1', episode_number: 1, watched_at: '2026-01-01T10:00:00' }),
      watched({ id: 'w2', episode_number: 2, watched_at: '2026-01-01T11:00:00' }),
      watched({ id: 'w3', episode_number: 3, watched_at: '2026-01-01T12:00:00' }),
    ]
    const [entry] = buildDiaryEntries([], rows, [])
    expect(entry.kind).toBe('watched')
    expect(entry.episodeCount).toBe(3)
    expect(entry.episodeLabel).toBe('S1E1-E3')
    expect(entry.at).toBe('2026-01-01T12:00:00')
  })

  it('labels a single-episode day with its episode name', () => {
    const [entry] = buildDiaryEntries([], [watched({ episode_name: 'The Pilot' })], [])
    expect(entry.episodeLabel).toBe('S1E1 · The Pilot')
  })

  it('excludes watched rows with an unknown date', () => {
    const entries = buildDiaryEntries([], [watched({ watched_at_unknown: true })], [])
    expect(entries).toHaveLength(0)
  })

  it('falls back to a season label when episodes are too scattered for a range', () => {
    const rows = [1, 2, 3, 4, 5].map((n) =>
      watched({ id: `w${n}`, episode_number: n * 2, watched_at: '2026-01-01T10:00:00' }),
    )
    const [entry] = buildDiaryEntries([], rows, [])
    expect(entry.episodeLabel).toBeUndefined()
    expect(entry.seasonLabel).toBe('Season 1')
  })

  it('adds a separate rewatch entry', () => {
    const entries = buildDiaryEntries([], [], [rewatch()])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('rewatched')
  })

  it('merges a same-day rating onto an existing watched entry instead of duplicating', () => {
    const rows = [watched({ watched_at: '2026-01-01T10:00:00' })]
    const entries = buildDiaryEntries([rating({ rated_at: '2026-01-01T18:00:00' })], rows, [])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('watched')
    expect(entries[0].rating).toBe(4)
  })

  it('creates a standalone rated entry when no same-day watched/rewatch entry exists', () => {
    const entries = buildDiaryEntries([rating()], [], [])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('rated')
  })

  it('sorts all entries reverse-chronologically', () => {
    const entries = buildDiaryEntries(
      [rating({ rated_at: '2026-01-01T00:00:00Z' })],
      [watched({ id: 'w9', watched_at: '2026-06-01T00:00:00Z' })],
      [],
    )
    expect(entries[0].kind).toBe('watched')
    expect(entries[1].kind).toBe('rated')
  })
})

describe('buildUndatedDiaryEntriesFromSummary', () => {
  function summary(overrides: Partial<UndatedShowWatchSummary> = {}): UndatedShowWatchSummary {
    return {
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      episode_count: 1,
      seasons: [1],
      sole_season_number: 1,
      sole_episode_number: 1,
      added_at: '2026-01-01T00:00:00Z',
      ...overrides,
    }
  }

  it('labels a single-episode summary with its season/episode', () => {
    const [entry] = buildUndatedDiaryEntriesFromSummary([summary()])
    expect(entry.episodeLabel).toBe('S1E1')
    expect(entry.at).toBe('')
  })

  it('uses a season label instead of an episode label for multi-episode summaries', () => {
    const [entry] = buildUndatedDiaryEntriesFromSummary([
      summary({ episode_count: 3, seasons: [1, 2], sole_season_number: null, sole_episode_number: null }),
    ])
    expect(entry.episodeLabel).toBeUndefined()
    expect(entry.seasonLabel).toBe('S1–S2')
  })

  it('orders by added_at descending, then show name for ties', () => {
    const entries = buildUndatedDiaryEntriesFromSummary([
      summary({ show_id: 1, show_name: 'Zeta', added_at: '2026-01-01T00:00:00Z' }),
      summary({ show_id: 2, show_name: 'Alpha', added_at: '2026-01-01T00:00:00Z' }),
      summary({ show_id: 3, show_name: 'Middle', added_at: '2026-02-01T00:00:00Z' }),
    ])
    expect(entries.map((e) => e.showName)).toEqual(['Middle', 'Alpha', 'Zeta'])
  })
})

describe('buildGroupActivity', () => {
  function ratingWithUser(overrides: Partial<ShowRatingWithUser> = {}): ShowRatingWithUser {
    return { ...rating(), users: { username: 'alice' }, ...overrides }
  }

  function watchedWithUser(overrides: Partial<EpisodeWatchedWithUser> = {}): EpisodeWatchedWithUser {
    return { ...watched(), users: { username: 'alice' }, ...overrides }
  }

  it('produces a finished event with episode count from a fully-watched show', () => {
    const rows = [1, 2].map((n) =>
      watchedWithUser({ id: `w${n}`, episode_number: n, show_total_episodes: 2, watched_at: `2026-01-0${n}T00:00:00Z` }),
    )
    const events = buildGroupActivity([], rows)
    expect(events).toHaveLength(1)
    expect(events[0].finished).toBe(true)
    expect(events[0].episodeCount).toBe(2)
  })

  it('produces a rated event for a show rated without episode tracking', () => {
    const events = buildGroupActivity([ratingWithUser()], [])
    expect(events).toHaveLength(1)
    expect(events[0].finished).toBe(false)
    expect(events[0].rating).toBe(4)
  })

  it('groups events per user, keeping usernames separate', () => {
    const events = buildGroupActivity(
      [ratingWithUser({ user_id: 'u1', users: { username: 'alice' } }), ratingWithUser({ id: 'r2', user_id: 'u2', show_id: 2, users: { username: 'bob' } })],
      [],
    )
    expect(events.map((e) => e.username).sort()).toEqual(['alice', 'bob'])
  })

  it('falls back to "unknown" when a user record has no username', () => {
    const events = buildGroupActivity([ratingWithUser({ users: null })], [])
    expect(events[0].username).toBe('unknown')
  })

  it('includes season ratings as their own events with a season number', () => {
    const events = buildGroupActivity([], [], [
      {
        id: 'sr1',
        user_id: 'u1',
        show_id: 1,
        show_name: 'Show One',
        show_poster_path: null,
        season_number: 2,
        season_name: 'Season 2',
        rating: 5,
        rated_at: '2026-01-01T00:00:00Z',
        users: { username: 'alice' },
      },
    ])
    expect(events).toHaveLength(1)
    expect(events[0].seasonNumber).toBe(2)
  })

  it('sorts all events reverse-chronologically', () => {
    const events = buildGroupActivity(
      [ratingWithUser({ rated_at: '2026-01-01T00:00:00Z' })],
      [watchedWithUser({ id: 'w9', show_id: 2, watched_at: '2026-06-01T00:00:00Z', show_total_episodes: 1 })],
    )
    expect(events[0].showId).toBe(2)
  })
})

describe('buildFollowActivity', () => {
  function follow(overrides: Partial<Follow> = {}): Follow {
    return { id: 'f1', follower_id: 'u1', followed_id: 'u2', created_at: '2026-01-01T00:00:00Z', ...overrides }
  }

  it('resolves usernames from the provided lookup', () => {
    const usernames = new Map([
      ['u1', 'alice'],
      ['u2', 'bob'],
    ])
    const [event] = buildFollowActivity([follow()], usernames)
    expect(event.followerUsername).toBe('alice')
    expect(event.followedUsername).toBe('bob')
  })

  it('skips a follow edge when either username cannot be resolved', () => {
    const events = buildFollowActivity([follow()], new Map([['u1', 'alice']]))
    expect(events).toHaveLength(0)
  })
})

describe('mergeActivityFeed', () => {
  it('merges show and follow events into one reverse-chronological feed', () => {
    const showEvent = {
      kind: 'show' as const,
      key: 's1',
      userId: 'u1',
      username: 'alice',
      showId: 1,
      showName: 'Show',
      showPosterPath: null,
      rating: null,
      finished: true,
      episodeCount: null,
      seasonNumber: null,
      at: '2026-01-01T00:00:00Z',
      atUnknown: false,
    }
    const followEvent = {
      kind: 'follow' as const,
      key: 'f1',
      followerId: 'u1',
      followerUsername: 'alice',
      followedId: 'u2',
      followedUsername: 'bob',
      at: '2026-06-01T00:00:00Z',
      atUnknown: false as const,
    }
    const merged = mergeActivityFeed([showEvent], [followEvent])
    expect(merged.map((e) => e.kind)).toEqual(['follow', 'show'])
  })
})
