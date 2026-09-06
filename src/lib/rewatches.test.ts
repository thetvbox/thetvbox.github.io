import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  deleteRewatch,
  fetchRecentRewatches,
  fetchRewatchesForShow,
  logRewatch,
  restoreRewatch,
  sortRewatchesDesc,
} from './rewatches'
import type { ShowRewatch } from '../types'

function row(overrides: Partial<ShowRewatch> = {}): ShowRewatch {
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

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('sortRewatchesDesc', () => {
  it('sorts newest first without mutating the input array', () => {
    const input = [row({ id: 'a', rewatched_at: '2024-01-01' }), row({ id: 'b', rewatched_at: '2025-01-01' })]
    const sorted = sortRewatchesDesc(input)
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a'])
    expect(input.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('returns an empty array for an empty input', () => {
    expect(sortRewatchesDesc([])).toEqual([])
  })
})

describe('fetchRewatchesForShow', () => {
  it('returns every rewatch for the show', async () => {
    mockFrom({ data: [row(), row({ id: 'rw2' })] })
    expect(await fetchRewatchesForShow('u1', 1)).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchRewatchesForShow('u1', 1)).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchRewatchesForShow('u1', 1)).rejects.toThrow('boom')
  })
})

describe('fetchRecentRewatches', () => {
  it('passes through a single page of results', async () => {
    const rows = [row()]
    mockFrom({ data: rows, count: rows.length })
    expect(await fetchRecentRewatches('u1')).toEqual(rows)
  })
})

describe('logRewatch', () => {
  it('inserts and returns the saved row', async () => {
    mockFrom({ data: row() })
    const saved = await logRewatch({
      userId: 'u1',
      showId: 1,
      showName: 'Show One',
      showPosterPath: null,
      rewatchedAt: '2026-01-01T00:00:00Z',
    })
    expect(saved).toEqual(row())
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('insert failed') })
    await expect(
      logRewatch({ userId: 'u1', showId: 1, showName: 'Show One', showPosterPath: null, rewatchedAt: '2026-01-01T00:00:00Z' }),
    ).rejects.toThrow('insert failed')
  })
})

describe('deleteRewatch', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(deleteRewatch('rw1')).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(deleteRewatch('rw1')).rejects.toThrow('delete failed')
  })
})

describe('restoreRewatch', () => {
  it('re-inserts the row and returns the restored row', async () => {
    mockFrom({ data: row() })
    const restored = await restoreRewatch(row())
    expect(restored).toEqual(row())
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('restore failed') })
    await expect(restoreRewatch(row())).rejects.toThrow('restore failed')
  })
})
