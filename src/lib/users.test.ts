import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchAllUsers, fetchUserByUsername } from './users'
import type { AppUser } from '../types'

function row(overrides: Partial<AppUser> = {}): AppUser {
  return { id: 'u1', email: 'a@example.com', username: 'alice', created_at: '2026-01-01T00:00:00Z', ...overrides }
}

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchAllUsers', () => {
  it('returns every user', async () => {
    mockFrom({ data: [row(), row({ id: 'u2', username: 'bob' })] })
    expect(await fetchAllUsers()).toHaveLength(2)
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchAllUsers()).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchAllUsers()).rejects.toThrow('boom')
  })
})

describe('fetchUserByUsername', () => {
  it('returns the user when found', async () => {
    mockFrom({ data: row() })
    expect(await fetchUserByUsername('alice')).toEqual(row())
  })

  it('returns null when not found', async () => {
    mockFrom({ data: null })
    expect(await fetchUserByUsername('nobody')).toBeNull()
  })
})
