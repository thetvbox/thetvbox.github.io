import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchStartedForUser, fetchStartedItem, startShow } from './showStarted'
import type { ShowStarted } from '../types'

function row(overrides: Partial<ShowStarted> = {}): ShowStarted {
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

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchStartedForUser', () => {
  it('returns every started show for the user', async () => {
    mockFrom({ data: [row(), row({ id: 's2', show_id: 2 })] })
    expect(await fetchStartedForUser('u1')).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchStartedForUser('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchStartedForUser('u1')).rejects.toThrow('boom')
  })
})

describe('fetchStartedItem', () => {
  it('returns the row when the show has been started', async () => {
    mockFrom({ data: row() })
    expect(await fetchStartedItem('u1', 1)).toEqual(row())
  })

  it('returns null when not started', async () => {
    mockFrom({ data: null })
    expect(await fetchStartedItem('u1', 1)).toBeNull()
  })
})

describe('startShow', () => {
  it('upserts on (user, show) and returns the saved row', async () => {
    const builder = mockFrom({ data: row() })
    const saved = await startShow({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      showTotalEpisodes: 10,
    })
    expect(saved).toEqual(row())
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', show_id: 1 }),
      { onConflict: 'user_id,show_id' },
    )
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('start failed') })
    await expect(
      startShow({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null, showTotalEpisodes: 10 }),
    ).rejects.toThrow('start failed')
  })
})
