import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), getUser: vi.fn(), signOut: vi.fn() },
  },
}))

import { supabase } from './supabase'
import { claimAccount, createAccount, endPendingSession, sendEmailCode, verifyEmailCode } from './accountSetup'

const login = { id: 'auth-1', email: 'Bob@Example.com' }

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
  vi.mocked(supabase.rpc).mockReset()
  vi.mocked(supabase.auth.signInWithOtp).mockReset().mockResolvedValue({ data: {}, error: null } as never)
  vi.mocked(supabase.auth.verifyOtp).mockReset().mockResolvedValue({ data: {}, error: null } as never)
  vi.mocked(supabase.auth.getUser).mockReset().mockResolvedValue({ data: { user: login }, error: null } as never)
  vi.mocked(supabase.auth.signOut).mockReset().mockResolvedValue({ error: null } as never)
})

describe('sendEmailCode', () => {
  it('emails a code to the normalized address, creating the login if needed', async () => {
    await sendEmailCode(' Bob@Example.com ')
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'bob@example.com', options: { shouldCreateUser: true } })
  })

  it('reports a friendly error when the code cannot be sent', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: new Error('rate limited') } as never)
    await expect(sendEmailCode('bob@example.com')).rejects.toThrow('We couldn’t send a code to that email. Try again in a minute.')
  })
})

describe('verifyEmailCode', () => {
  it('checks the code for the normalized address', async () => {
    await verifyEmailCode('Bob@Example.com', ' 123456 ')
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'bob@example.com', token: '123456', type: 'email' })
  })

  it('reports a wrong code', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: {}, error: new Error('expired') } as never)
    await expect(verifyEmailCode('bob@example.com', '000000')).rejects.toThrow('That code didn’t work.')
  })
})

describe('createAccount', () => {
  it('redeems the invite, then creates the account for the confirmed login without reading it back', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    const builder = mockFrom({ data: null, error: null })

    const account = await createAccount(' bob ', 'secret')

    expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite', { code: 'secret' })
    expect(account).toMatchObject({ email: 'bob@example.com', username: 'bob' })
    expect(builder.insert).toHaveBeenCalledWith({ id: account.id, email: 'bob@example.com', username: 'bob', auth_user_id: 'auth-1' })
    expect(builder.select).not.toHaveBeenCalled()
  })

  it('refuses without a confirmed login', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as never)
    await expect(createAccount('bob', 'secret')).rejects.toThrow('Confirm your email again')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('reports a wrong invite code without creating anything', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as never)
    await expect(createAccount('bob', 'nope')).rejects.toThrow('That invite code isn’t right.')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('passes on the server message when invite attempts are limited', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'Too many invite code attempts.' } } as never)
    await expect(createAccount('bob', 'nope')).rejects.toThrow('Too many invite code attempts.')
  })

  it('explains a taken username or email', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    mockFrom({ error: { code: '23505', message: 'duplicate key value violates unique constraint "users_username_key"' } })
    await expect(createAccount('bob', 'secret')).rejects.toThrow('That username is taken. Try another.')
    mockFrom({ error: { code: '23505', message: 'duplicate key value violates unique constraint "users_email_lower_key"' } })
    await expect(createAccount('bob', 'secret')).rejects.toThrow('An account with that email already exists.')
  })

  it('passes on any other insert error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    mockFrom({ error: { code: '42501', message: 'An invite code is needed to create an account.' } })
    await expect(createAccount('bob', 'secret')).rejects.toThrow('An invite code is needed to create an account.')
  })
})

describe('claimAccount', () => {
  it('links the login to the account with the same email and returns it', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'u1', error: null } as never)
    const builder = mockFrom({ data: { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: 'x' }, error: null })
    expect(await claimAccount()).toMatchObject({ id: 'u1', username: 'bob' })
    expect(supabase.rpc).toHaveBeenCalledWith('claim_account_by_email')
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('reports an email that matches no account', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
    await expect(claimAccount()).rejects.toThrow('We couldn’t match that email to an account.')
  })

  it('reports an account that cannot be read', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'u1', error: null } as never)
    mockFrom({ data: null, error: { message: 'denied' } })
    await expect(claimAccount()).rejects.toThrow('We couldn’t load your account. Try again.')
  })
})

describe('endPendingSession', () => {
  it('signs the half-finished login out', async () => {
    await endPendingSession()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('never throws', async () => {
    vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('offline'))
    await expect(endPendingSession()).resolves.toBeUndefined()
  })
})
