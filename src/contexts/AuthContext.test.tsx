import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase'
import { AuthProvider, useAuth } from './AuthContext'
import { STORAGE_KEYS } from '../lib/constants'
import type { AppUser } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function mockFrom(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'eq', 'single', 'maybeSingle']
  for (const m of methods) builder[m] = vi.fn(() => builder)
  ;(builder as { then: unknown }).then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(onFulfilled)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(supabase.from).mockReset()
})

describe('AuthContext', () => {
  it('has no user and loading false when there is no stored session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('restores a stored session user on mount', async () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(bob))
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(bob)
  })

  it('clears a corrupted stored session rather than throwing', async () => {
    localStorage.setItem(STORAGE_KEYS.user, '{not json')
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })

  it('findByEmail returns the matched user, lowercased and trimmed', async () => {
    const builder = mockFrom({ data: bob })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const found = await result.current.findByEmail('  BOB@Example.com  ')
    expect(found).toEqual(bob)
    expect(builder.eq).toHaveBeenCalledWith('email', 'bob@example.com')
  })

  it('findByEmail returns null when no match', async () => {
    mockFrom({ data: null })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(await result.current.findByEmail('nobody@example.com')).toBeNull()
  })

  it('findByEmail throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.findByEmail('bob@example.com')).rejects.toThrow('boom')
  })

  it('register saves the new user, persists it, and signs them in', async () => {
    mockFrom({ data: bob })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const registered = await act(() => result.current.register('bob@example.com', 'bob'))
    expect(registered).toEqual(bob)
    expect(result.current.user).toEqual(bob)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.user)!)).toEqual(bob)
  })

  it('register surfaces a friendly message for a duplicate username', async () => {
    mockFrom({ error: { code: '23505', message: 'duplicate key value violates unique constraint "users_username_key"' } })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.register('bob@example.com', 'bob')).rejects.toThrow('That username is taken. Try another.')
  })

  it('register surfaces a friendly message for a duplicate email', async () => {
    mockFrom({ error: { code: '23505', message: 'duplicate key value violates unique constraint "users_email_key"' } })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.register('bob@example.com', 'bob')).rejects.toThrow(
      'An account with that email already exists.',
    )
  })

  it('register rethrows non-conflict Supabase errors as-is', async () => {
    mockFrom({ error: { code: '500', message: 'server error' } })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.register('bob@example.com', 'bob')).rejects.toMatchObject({ message: 'server error' })
  })

  it('signIn persists the user and updates state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.signIn(bob))
    expect(result.current.user).toEqual(bob)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.user)!)).toEqual(bob)
  })

  it('signOut clears the user and storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.signIn(bob))
    act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })

  it('throws when useAuth is called outside a provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
  })
})
