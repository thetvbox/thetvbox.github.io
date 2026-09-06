import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchShowWatchSummary, fetchUndatedShowWatchSummary } from './showWatchSummary'
import type { ShowWatchSummary, UndatedShowWatchSummary } from '../types'

function summary(overrides: Partial<ShowWatchSummary> = {}): ShowWatchSummary {
  return {
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    watched_count: 5,
    total_episodes: 10,
    last_watched_at: '2026-01-01T00:00:00Z',
    last_watched_at_unknown: false,
    runtime_minutes_sum: 150,
    ...overrides,
  }
}

function undatedSummary(overrides: Partial<UndatedShowWatchSummary> = {}): UndatedShowWatchSummary {
  return {
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    episode_count: 3,
    seasons: [1],
    sole_season_number: 1,
    sole_episode_number: null,
    added_at: '2026-01-01T00:00:00Z',
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

describe('fetchShowWatchSummary', () => {
  it('returns the per-show rollup rows', async () => {
    mockFrom({ data: [summary(), summary({ show_id: 2 })] })
    expect(await fetchShowWatchSummary('u1')).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchShowWatchSummary('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchShowWatchSummary('u1')).rejects.toThrow('boom')
  })
})

describe('fetchUndatedShowWatchSummary', () => {
  it('returns the undated rollup rows', async () => {
    mockFrom({ data: [undatedSummary()] })
    expect(await fetchUndatedShowWatchSummary('u1')).toEqual([undatedSummary()])
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchUndatedShowWatchSummary('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchUndatedShowWatchSummary('u1')).rejects.toThrow('boom')
  })
})
