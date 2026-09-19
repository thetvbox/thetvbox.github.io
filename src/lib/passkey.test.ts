import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'

vi.mock('./supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))
vi.mock('@simplewebauthn/browser', async () => {
  const actual = await vi.importActual<typeof import('@simplewebauthn/browser')>('@simplewebauthn/browser')
  return {
    ...actual,
    startAuthentication: vi.fn(),
    startRegistration: vi.fn(),
    browserSupportsWebAuthn: vi.fn(),
  }
})

import { startAuthentication, startRegistration, browserSupportsWebAuthn, WebAuthnError } from '@simplewebauthn/browser'
import { supabase } from './supabase'
import {
  PasskeyCancelledError,
  fetchAuthenticationOptions,
  fetchRegistrationOptions,
  isPasskeySupported,
  registerPasskey,
  signInWithPasskey,
} from './passkey'

function httpError(body: unknown) {
  return new FunctionsHttpError({ json: () => Promise.resolve(body) } as never)
}

beforeEach(() => {
  vi.mocked(supabase.functions.invoke).mockReset()
  vi.mocked(startAuthentication).mockReset()
  vi.mocked(startRegistration).mockReset()
  vi.mocked(browserSupportsWebAuthn).mockReset()
})

describe('isPasskeySupported', () => {
  it('reflects the browser feature check', () => {
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(true)
    expect(isPasskeySupported()).toBe(true)
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(false)
    expect(isPasskeySupported()).toBe(false)
  })
})

describe('fetchAuthenticationOptions', () => {
  it('returns ready with the options on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { options: { challenge: 'c1' } }, error: null } as never)
    const result = await fetchAuthenticationOptions('me@example.com')
    expect(result).toEqual({ status: 'ready', options: { challenge: 'c1' } })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('webauthn-authentication-options', {
      body: { email: 'me@example.com' },
    })
  })

  it('returns no_user when the server reports no account for that email', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'No account found.', reason: 'no_user' }),
    } as never)
    expect(await fetchAuthenticationOptions('nobody@example.com')).toEqual({ status: 'no_user' })
  })

  it('returns no_credentials with the user summary when the account has no passkey yet', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'No passkey yet.', reason: 'no_credentials', user: { id: 'u1', username: 'bob' } }),
    } as never)
    expect(await fetchAuthenticationOptions('bob@example.com')).toEqual({
      status: 'no_credentials',
      user: { id: 'u1', username: 'bob' },
    })
  })

  it('throws with the server message for any other failure', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'Server exploded.' }),
    } as never)
    await expect(fetchAuthenticationOptions('me@example.com')).rejects.toThrow('Server exploded.')
  })

  it('falls back to a generic message for a non-HTTP error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('network down') } as never)
    await expect(fetchAuthenticationOptions('me@example.com')).rejects.toThrow('Something went wrong. Try again.')
  })
})

describe('fetchRegistrationOptions', () => {
  it('returns the options on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { options: { challenge: 'c2' } }, error: null } as never)
    const options = await fetchRegistrationOptions('u1')
    expect(options).toEqual({ challenge: 'c2' })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('webauthn-registration-options', { body: { user_id: 'u1' } })
  })

  it('throws with the server message on failure', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'This account already has a passkey.' }),
    } as never)
    await expect(fetchRegistrationOptions('u1')).rejects.toThrow('This account already has a passkey.')
  })
})

describe('signInWithPasskey', () => {
  const options = { challenge: 'c1' } as never

  it('runs the authentication ceremony and returns the verified user', async () => {
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'cred1' } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { user: { id: 'u1', username: 'bob' } },
      error: null,
    } as never)

    const user = await signInWithPasskey('bob@example.com', options)
    expect(user).toEqual({ id: 'u1', username: 'bob' })
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: options })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('webauthn-authentication-verify', {
      body: { email: 'bob@example.com', response: { id: 'cred1' } },
    })
  })

  it('throws PasskeyCancelledError when the ceremony is aborted', async () => {
    vi.mocked(startAuthentication).mockRejectedValue(
      new WebAuthnError({ message: 'aborted', code: 'ERROR_CEREMONY_ABORTED', cause: new Error('aborted') }),
    )
    await expect(signInWithPasskey('bob@example.com', options)).rejects.toThrow(PasskeyCancelledError)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('throws a friendly error for any other ceremony failure', async () => {
    vi.mocked(startAuthentication).mockRejectedValue(new Error('boom'))
    await expect(signInWithPasskey('bob@example.com', options)).rejects.toThrow(
      'Your device could not complete the passkey request. Try again.',
    )
  })

  it('throws with the server message when verification fails', async () => {
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'cred1' } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'Signature verification failed.' }),
    } as never)
    await expect(signInWithPasskey('bob@example.com', options)).rejects.toThrow('Signature verification failed.')
  })
})

describe('registerPasskey', () => {
  const options = { challenge: 'c2' } as never

  it('runs the registration ceremony and returns the verified user', async () => {
    vi.mocked(startRegistration).mockResolvedValue({ id: 'cred2' } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { user: { id: 'u1', username: 'bob' } },
      error: null,
    } as never)

    const user = await registerPasskey('u1', options)
    expect(user).toEqual({ id: 'u1', username: 'bob' })
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: options })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('webauthn-registration-verify', {
      body: { user_id: 'u1', response: { id: 'cred2' } },
    })
  })

  it('throws PasskeyCancelledError when the ceremony is aborted', async () => {
    vi.mocked(startRegistration).mockRejectedValue(
      new WebAuthnError({ message: 'aborted', code: 'ERROR_CEREMONY_ABORTED', cause: new Error('aborted') }),
    )
    await expect(registerPasskey('u1', options)).rejects.toThrow(PasskeyCancelledError)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('throws with the server message when verification fails', async () => {
    vi.mocked(startRegistration).mockResolvedValue({ id: 'cred2' } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpError({ error: 'Challenge expired.' }),
    } as never)
    await expect(registerPasskey('u1', options)).rejects.toThrow('Challenge expired.')
  })
})
