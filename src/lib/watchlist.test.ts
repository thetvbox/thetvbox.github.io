import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { addToWatchlist, fetchWatchlist, fetchWatchlistItem, removeFromWatchlist } from './watchlist'
import type { WatchlistItem } from '../types'

function row(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
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

describe('fetchWatchlist', () => {
  it('returns every watchlist item for the user', async () => {
    mockFrom({ data: [row(), row({ id: 'w2', show_id: 2 })] })
    expect(await fetchWatchlist('u1')).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchWatchlist('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchWatchlist('u1')).rejects.toThrow('boom')
  })
})

describe('fetchWatchlistItem', () => {
  it('returns the item when the show is on the watchlist', async () => {
    mockFrom({ data: row() })
    expect(await fetchWatchlistItem('u1', 1)).toEqual(row())
  })

  it('returns null when not on the watchlist', async () => {
    mockFrom({ data: null })
    expect(await fetchWatchlistItem('u1', 1)).toBeNull()
  })
})

describe('addToWatchlist', () => {
  it('upserts on (user, show) and returns the saved row', async () => {
    const builder = mockFrom({ data: row() })
    const saved = await addToWatchlist({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null })
    expect(saved).toEqual(row())
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', show_id: 1 }),
      { onConflict: 'user_id,show_id' },
    )
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('upsert failed') })
    await expect(
      addToWatchlist({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null }),
    ).rejects.toThrow('upsert failed')
  })
})

describe('removeFromWatchlist', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(removeFromWatchlist('u1', 1)).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(removeFromWatchlist('u1', 1)).rejects.toThrow('delete failed')
  })
})
