import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(), signOut: vi.fn() } },
}))

import { supabase } from '../lib/supabase'
import { AuthProvider, useAuth } from './AuthContext'
import { STORAGE_KEYS } from '../lib/constants'
import type { AppUser } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

let authListener: ((event: string) => void) | null = null
const unsubscribe = vi.fn()

/** Makes the mocked Supabase client report a stored session, or none. */
function mockSession(hasSession: boolean) {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: hasSession ? { access_token: 'a' } : null },
    error: null,
  } as never)
}

beforeEach(() => {
  localStorage.clear()
  mockSession(true)
  authListener = null
  unsubscribe.mockReset()
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(((listener: (event: string) => void) => {
    authListener = listener
    return { data: { subscription: { unsubscribe } } }
  }) as never)
  vi.mocked(supabase.auth.signOut).mockReset()
  vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
})

describe('AuthContext', () => {
  it('has no user when there is no stored session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.user).toBeNull()
  })

  it('restores a stored session user on mount', async () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(bob))
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.user).toEqual(bob)
  })

  it('clears a corrupted stored session rather than throwing', async () => {
    localStorage.setItem(STORAGE_KEYS.user, '{not json')
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })

  it('signIn persists the user and updates state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    act(() => result.current.signIn(bob))
    expect(result.current.user).toEqual(bob)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.user)!)).toEqual(bob)
  })

  it('signOut clears the user and storage, and ends the Supabase session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    act(() => result.current.signIn(bob))
    act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('signs out a stored user who has no Supabase session, so they sign in again', async () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(bob))
    mockSession(false)
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.user).toBeNull())
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })

  it('keeps a stored user whose Supabase session is still there', async () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(bob))
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled())
    expect(result.current.user).toEqual(bob)
  })

  it('does not check for a session when nobody is stored', () => {
    renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(supabase.auth.getSession).not.toHaveBeenCalled()
  })

  it('clears the user when Supabase reports the session ended', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    act(() => result.current.signIn(bob))
    act(() => authListener?.('TOKEN_REFRESHED'))
    expect(result.current.user).toEqual(bob)
    act(() => authListener?.('SIGNED_OUT'))
    expect(result.current.user).toBeNull()
  })

  it('stops listening to Supabase when unmounted', () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('throws when useAuth is called outside a provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
  })
})
