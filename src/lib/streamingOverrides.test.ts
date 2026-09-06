import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { clearStreamingOverride, fetchStreamingOverride, setStreamingOverride } from './streamingOverrides'
import type { StreamingOverride } from '../types'

function row(overrides: Partial<StreamingOverride> = {}): StreamingOverride {
  return {
    id: 'o1',
    show_id: 1,
    provider_id: 8,
    provider_name: 'Netflix',
    provider_logo_path: '/netflix.png',
    updated_by: 'u1',
    updated_at: '2026-01-01T00:00:00Z',
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

describe('fetchStreamingOverride', () => {
  it('returns the override when one has been set', async () => {
    mockFrom({ data: row() })
    expect(await fetchStreamingOverride(1)).toEqual(row())
  })

  it('returns null when no override exists', async () => {
    mockFrom({ data: null })
    expect(await fetchStreamingOverride(1)).toBeNull()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchStreamingOverride(1)).rejects.toThrow('boom')
  })
})

describe('setStreamingOverride', () => {
  it('upserts on show_id and returns the saved row', async () => {
    const builder = mockFrom({ data: row() })
    const saved = await setStreamingOverride({
      showId: 1,
      providerId: 8,
      providerName: 'Netflix',
      providerLogoPath: '/netflix.png',
      updatedBy: 'u1',
    })
    expect(saved).toEqual(row())
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ show_id: 1 }), { onConflict: 'show_id' })
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('upsert failed') })
    await expect(
      setStreamingOverride({ showId: 1, providerId: 8, providerName: 'Netflix', providerLogoPath: null, updatedBy: 'u1' }),
    ).rejects.toThrow('upsert failed')
  })
})

describe('clearStreamingOverride', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(clearStreamingOverride(1)).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(clearStreamingOverride(1)).rejects.toThrow('delete failed')
  })
})
