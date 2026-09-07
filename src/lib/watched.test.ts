import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  UNKNOWN_WATCHED_AT,
  bulkMarkWatched,
  bulkUnmarkWatched,
  fetchRecentDatedWatched,
  fetchRecentWatched,
  fetchRecentWatchedAllUsers,
  fetchWatchedForShow,
  fetchWatchedForUserAndShow,
  markWatched,
  restoreWatched,
  unmarkWatched,
  watchedKey,
} from './watched'
import type { EpisodeWatched } from '../types'

function row(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
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

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('watchedKey', () => {
  it('joins season and episode number with a dash', () => {
    expect(watchedKey(2, 5)).toBe('2-5')
  })
})

describe('UNKNOWN_WATCHED_AT', () => {
  it('is the epoch timestamp', () => {
    expect(UNKNOWN_WATCHED_AT).toBe(new Date(0).toISOString())
  })
})

describe('fetchWatchedForUserAndShow', () => {
  it('returns rows from the query', async () => {
    mockFrom({ data: [row()], error: null })
    const result = await fetchWatchedForUserAndShow('u1', 1)
    expect(result).toEqual([row()])
    expect(supabase.from).toHaveBeenCalledWith('episode_watched')
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null, error: null })
    expect(await fetchWatchedForUserAndShow('u1', 1)).toEqual([])
  })

  it('throws the Supabase error', async () => {
    mockFrom({ data: null, error: { message: 'db down' } })
    await expect(fetchWatchedForUserAndShow('u1', 1)).rejects.toEqual({ message: 'db down' })
  })
})

describe('fetchWatchedForShow', () => {
  it('keys rows by season-episode', async () => {
    mockFrom({ data: [row({ season_number: 2, episode_number: 5 })], error: null })
    const map = await fetchWatchedForShow('u1', 1)
    expect(Object.keys(map)).toEqual(['2-5'])
  })
})

describe('fetchRecentWatched', () => {
  it('returns a single page of results', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentWatched('u1')).toEqual(rows)
  })
})

describe('fetchRecentDatedWatched', () => {
  it('returns a single page of results with real dates', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentDatedWatched('u1')).toEqual(rows)
  })
})

describe('fetchRecentWatchedAllUsers', () => {
  it('returns a single page of results across every user', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentWatchedAllUsers()).toEqual(rows)
  })
})

describe('markWatched', () => {
  it('upserts with the current timestamp and known-date flag', async () => {
    const builder = mockFrom({ data: row(), error: null })
    await markWatched({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      showTotalEpisodes: 10,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeName: 'Pilot',
    })
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ watched_at_unknown: false, season_number: 1, episode_number: 1 }),
      { onConflict: 'user_id,show_id,season_number,episode_number' },
    )
  })

  it('defaults runtimeMinutes to null when omitted', async () => {
    const builder = mockFrom({ data: row(), error: null })
    await markWatched({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      showTotalEpisodes: 10,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeName: null,
    })
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ runtime_minutes: null }),
      expect.anything(),
    )
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'conflict' } })
    await expect(
      markWatched({
        userId: 'u1',
        showId: 1,
        showName: 'Show',
        showPosterPath: null,
        showTotalEpisodes: null,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeName: null,
      }),
    ).rejects.toEqual({ message: 'conflict' })
  })
})

describe('bulkMarkWatched', () => {
  it('short-circuits with no request when episodes is empty', async () => {
    const result = await bulkMarkWatched({
      userId: 'u1',
      showId: 1,
      showName: 'Show',
      showPosterPath: null,
      showTotalEpisodes: null,
      episodes: [],
      watchedAt: '2026-01-01T00:00:00Z',
    })
    expect(result).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('upserts one row per episode with the shared watchedAt', async () => {
    const builder = mockFrom({ data: [row(), row({ id: 'w2', episode_number: 2 })], error: null })
    await bulkMarkWatched({
      userId: 'u1',
      showId: 1,
      showName: 'Show',
      showPosterPath: null,
      showTotalEpisodes: 2,
      episodes: [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
      ],
      watchedAt: '2026-01-01T00:00:00Z',
      watchedAtUnknown: true,
    })
    const [rows] = builder.upsert.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(rows.every((r: EpisodeWatched) => r.watched_at_unknown === true)).toBe(true)
  })

  it('throws on error', async () => {
    mockFrom({ data: null, error: { message: 'boom' } })
    await expect(
      bulkMarkWatched({
        userId: 'u1',
        showId: 1,
        showName: 'Show',
        showPosterPath: null,
        showTotalEpisodes: null,
        episodes: [{ seasonNumber: 1, episodeNumber: 1 }],
        watchedAt: '2026-01-01T00:00:00Z',
      }),
    ).rejects.toEqual({ message: 'boom' })
  })
})

describe('unmarkWatched', () => {
  it('resolves without throwing when there is no error', async () => {
    mockFrom({ error: null })
    await expect(unmarkWatched('u1', 1, 1, 1)).resolves.toBeUndefined()
  })

  it('throws the error', async () => {
    mockFrom({ error: { message: 'not found' } })
    await expect(unmarkWatched('u1', 1, 1, 1)).rejects.toEqual({ message: 'not found' })
  })
})

describe('restoreWatched', () => {
  it('short-circuits on an empty array', async () => {
    expect(await restoreWatched([])).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('re-upserts the exact prior rows', async () => {
    const builder = mockFrom({ data: [row()], error: null })
    await restoreWatched([row()])
    expect(builder.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ watched_at: '2026-01-01T00:00:00Z' })],
      { onConflict: 'user_id,show_id,season_number,episode_number' },
    )
  })
})

describe('bulkUnmarkWatched', () => {
  it('short-circuits on an empty episode list', async () => {
    await bulkUnmarkWatched('u1', 1, [])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('builds an or() filter covering every episode', async () => {
    const builder = mockFrom({ error: null })
    await bulkUnmarkWatched('u1', 1, [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 2, episodeNumber: 3 },
    ])
    expect(builder.or).toHaveBeenCalledWith(
      'and(season_number.eq.1,episode_number.eq.1),and(season_number.eq.2,episode_number.eq.3)',
    )
  })

  it('throws on error', async () => {
    mockFrom({ error: { message: 'fail' } })
    await expect(bulkUnmarkWatched('u1', 1, [{ seasonNumber: 1, episodeNumber: 1 }])).rejects.toEqual({
      message: 'fail',
    })
  })
})
