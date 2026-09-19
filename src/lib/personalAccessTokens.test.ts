import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  createPersonalAccessToken,
  fetchPersonalAccessTokens,
  generateAccessToken,
  hashAccessToken,
  revokePersonalAccessToken,
} from './personalAccessTokens'
import type { PersonalAccessTokenSummary } from '../types'

function summary(overrides: Partial<PersonalAccessTokenSummary> = {}): PersonalAccessTokenSummary {
  return {
    id: 'pat1',
    label: 'Shortcuts',
    created_at: '2026-01-01T00:00:00Z',
    last_used_at: null,
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

describe('generateAccessToken', () => {
  it('produces a prefixed, 64-hex-char token', () => {
    const token = generateAccessToken()
    expect(token).toMatch(/^tvbox_pat_[0-9a-f]{64}$/)
  })

  it('never repeats a token across calls', () => {
    expect(generateAccessToken()).not.toBe(generateAccessToken())
  })
})

describe('hashAccessToken', () => {
  it('is deterministic for the same input', async () => {
    const a = await hashAccessToken('tvbox_pat_abc')
    const b = await hashAccessToken('tvbox_pat_abc')
    expect(a).toBe(b)
  })

  it('produces a 64-hex-char SHA-256 digest', async () => {
    const hash = await hashAccessToken('tvbox_pat_abc')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different inputs', async () => {
    const a = await hashAccessToken('tvbox_pat_abc')
    const b = await hashAccessToken('tvbox_pat_xyz')
    expect(a).not.toBe(b)
  })
})

describe('createPersonalAccessToken', () => {
  it('inserts the hash of the returned raw token, never the token itself', async () => {
    const builder = mockFrom({ data: summary() })
    const { token, summary: saved } = await createPersonalAccessToken('u1', 'iPhone Shortcuts')
    expect(saved).toEqual(summary())
    expect(token).toMatch(/^tvbox_pat_[0-9a-f]{64}$/)

    const insertedArg = vi.mocked(builder.insert).mock.calls[0][0] as { user_id: string; token_hash: string; label: string }
    expect(insertedArg.user_id).toBe('u1')
    expect(insertedArg.label).toBe('iPhone Shortcuts')
    expect(insertedArg.token_hash).toBe(await hashAccessToken(token))
  })

  it('defaults a blank label to "Shortcuts"', async () => {
    const builder = mockFrom({ data: summary() })
    await createPersonalAccessToken('u1', '   ')
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ label: 'Shortcuts' }))
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('insert failed') })
    await expect(createPersonalAccessToken('u1', 'Shortcuts')).rejects.toThrow('insert failed')
  })
})

describe('fetchPersonalAccessTokens', () => {
  it('returns the rows for the given user', async () => {
    mockFrom({ data: [summary(), summary({ id: 'pat2' })] })
    const result = await fetchPersonalAccessTokens('u1')
    expect(result).toEqual([summary(), summary({ id: 'pat2' })])
  })

  it('returns an empty array when there are no tokens', async () => {
    mockFrom({ data: null })
    expect(await fetchPersonalAccessTokens('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('select failed') })
    await expect(fetchPersonalAccessTokens('u1')).rejects.toThrow('select failed')
  })
})

describe('revokePersonalAccessToken', () => {
  it('resolves without error on success', async () => {
    mockFrom({})
    await expect(revokePersonalAccessToken('pat1')).resolves.toBeUndefined()
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(revokePersonalAccessToken('pat1')).rejects.toThrow('delete failed')
  })
})
